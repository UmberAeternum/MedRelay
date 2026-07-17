import { ClinicianHandoffSchema, ConversationReplySchema, LIMITATION, type ClinicianHandoff, type ConversationReply } from "./schemas";
import { containsPromptInjection, screenPatientSafety, type SafetyResult } from "./safety";
import { requireValidEvidence } from "./evidence";
import { isSemanticallySafe } from "./semanticValidation";
import type { ConversationSession, PatientMessage, SessionStore } from "./sessionStore";

export type ModelProvider = {
  configured: boolean;
  model: string;
  reply(messages: PatientMessage[], safety: SafetyResult): Promise<unknown>;
  handoff(messages: PatientMessage[], safety: SafetyResult): Promise<unknown>;
};

export type ProviderMode = "live" | "offline" | "deterministic";

const appointment = { requested: false, reason: null, recommendedSpecialty: null, confirmationRequired: true as const, booked: false as const };
const noEvidenceReply = (message: string, safety: SafetyResult): ConversationReply => ({
  message, followUpQuestion: null, informationGaps: ["More patient-provided details are needed."],
  careLevel: safety.careLevel, careRationale: "Deterministic patient-only safety screening result.",
  warningSigns: safety.warningSigns, emergencyGuidance: safety.emergencyGuidance,
  appointmentHandoff: appointment, evidence: safety.evidence,
  clinicianReviewRequired: true, limitations: LIMITATION,
});

function latestDirectEvidence(messages: PatientMessage[]) {
  return messages.map(message => ({ sourceMessageId: message.id, quote: message.content.slice(0, 500), kind: "direct" as const, requiresConfirmation: false, targetField: "summary" as const }));
}

function offlineHandoff(messages: PatientMessage[], safety: SafetyResult): ClinicianHandoff {
  const statements = messages.map(m => m.content);
  const correctionIndex = messages.findLastIndex(message => /^(?:actually|correction:|i meant|असल में|నిజానికి)/i.test(message.content.trim()));
  const currentStatements = correctionIndex >= 0 ? statements.slice(correctionIndex) : statements;
  return {
    title: "Clinician-review symptom-intake draft",
    summary: currentStatements.length ? `Patient-reported statements: ${currentStatements.join(" | ")}` : "No patient statement provided.",
    reportedSymptoms: currentStatements, timeline: null, relevantHistory: [], reportedMedications: [], reportedAllergies: [],
    informationGaps: ["Timeline", "Relevant history", "Current medications", "Allergies"],
    warningSigns: safety.warningSigns, careLevel: safety.careLevel,
    careRationale: "Deterministic patient-only safety screening; clinical interpretation is still required.",
    emergencyGuidance: safety.emergencyGuidance,
    patientNextSteps: safety.careLevel === "emergency_services" ? [safety.emergencyGuidance!] : ["Review and edit this draft before sharing it with a clinician."],
    questionsForClinician: ["What additional history or examination is needed?"],
    appointmentHandoff: appointment, evidence: [...latestDirectEvidence(messages), ...safety.evidence],
    clinicianReviewRequired: true, limitations: LIMITATION,
  };
}

export class MedRelayService {
  constructor(readonly sessions: SessionStore, readonly provider: ModelProvider) {}

  status() { return { model: this.provider.model, configured: this.provider.configured, liveVerifiedThisSession: false, demoStorage: this.sessions.kind }; }

  async start(ownerKey: string) {
    const { session, accessToken } = await this.sessions.create(ownerKey);
    return { conversationId: session.id, accessToken, expiresAt: new Date(session.expiresAt).toISOString(), messages: [] };
  }

  private async requireSession(id: string, token: string, ownerKey: string): Promise<ConversationSession> {
    const session = await this.sessions.get(id, token, ownerKey);
    if (!session) throw new Error("SESSION_NOT_FOUND");
    return session;
  }

  async continue(id: string, token: string, ownerKey: string, content: string) {
    const session = await this.requireSession(id, token, ownerKey);
    const patient = this.sessions.appendPatient(session, content);
    await this.sessions.save(session);
    const patients = session.messages.filter((m): m is PatientMessage => m.role === "patient");
    const safety = screenPatientSafety(patients);
    let reply: ConversationReply;
    let providerMode: ProviderMode = "deterministic";

    if (safety.careLevel === "emergency_services") {
      reply = noEvidenceReply(safety.emergencyGuidance!, safety);
    } else if (containsPromptInjection(patients.map(m => m.content))) {
      reply = noEvidenceReply("I can only help capture patient-reported information for a clinician-review draft. Please describe the health concern in your own words.", safety);
    } else if (!this.provider.configured) {
      providerMode = "offline";
      reply = noEvidenceReply("AI generation is unavailable. Your statement was saved ephemerally; add details or create a deterministic draft.", safety);
    } else {
      const parsed = ConversationReplySchema.parse(await this.provider.reply(patients, safety));
      if (!isSemanticallySafe([JSON.stringify(parsed)])) throw new Error("UNSAFE_MODEL_OUTPUT");
      requireValidEvidence(parsed.evidence, patients);
      if (safety.careLevel === "urgent_clinician_review" && parsed.careLevel === "routine_clinician_review") throw new Error("URGENCY_DOWNGRADE");
      reply = { ...parsed, careLevel: safety.careLevel === "urgent_clinician_review" ? safety.careLevel : parsed.careLevel,
        warningSigns: [...new Set([...safety.warningSigns, ...parsed.warningSigns])], evidence: [...safety.evidence, ...parsed.evidence] };
      providerMode = "live";
    }
    const assistant = this.sessions.appendAssistant(session, reply.message);
    await this.sessions.save(session);
    return { patientMessage: patient, assistantMessage: assistant, reply, safety, providerMode,
      state: { storyCaptured: patients.length > 0, safetyChecked: true, evidenceVerified: reply.evidence.every(e => !requireEvidenceIssue(e, patients)), handoffReady: false } };
  }

  async handoff(id: string, token: string, ownerKey: string) {
    const session = await this.requireSession(id, token, ownerKey);
    const patients = session.messages.filter((m): m is PatientMessage => m.role === "patient");
    if (!patients.length) throw new Error("NO_PATIENT_MESSAGES");
    const safety = screenPatientSafety(patients);
    let draft: ClinicianHandoff;
    let providerMode: ProviderMode = "offline";
    if (!this.provider.configured || safety.careLevel === "emergency_services" || containsPromptInjection(patients.map(m => m.content))) {
      draft = offlineHandoff(patients, safety);
      providerMode = safety.careLevel === "emergency_services" ? "deterministic" : "offline";
    } else {
      draft = ClinicianHandoffSchema.parse(await this.provider.handoff(patients, safety));
      if (!isSemanticallySafe([JSON.stringify(draft)])) throw new Error("UNSAFE_MODEL_OUTPUT");
      requireValidEvidence(draft.evidence, patients);
      if (safety.careLevel === "urgent_clinician_review" && draft.careLevel === "routine_clinician_review") throw new Error("URGENCY_DOWNGRADE");
      draft = { ...draft, careLevel: safety.careLevel === "routine_clinician_review" ? draft.careLevel : safety.careLevel,
        warningSigns: [...new Set([...safety.warningSigns, ...draft.warningSigns])], evidence: [...safety.evidence, ...draft.evidence] };
      providerMode = "live";
    }
    requireValidEvidence(draft.evidence, patients);
    return { draft, safety, providerMode, transcript: patients,
      state: { storyCaptured: true, safetyChecked: true, evidenceVerified: true, handoffReady: true } };
  }

  async reset(id: string, token: string, ownerKey: string) { return { deleted: await this.sessions.delete(id, token, ownerKey) }; }
}

function requireEvidenceIssue(evidence: ClinicianHandoff["evidence"][number], patients: PatientMessage[]) {
  try { requireValidEvidence([evidence], patients); return false; } catch { return true; }
}

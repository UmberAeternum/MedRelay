import { ClinicianHandoffSchema, ConversationReplySchema, LIMITATION, type ClinicianHandoff, type ConversationReply } from "./schemas.js";
import { containsPromptInjection, screenPatientSafety, type SafetyResult } from "./safety.js";
import { dedupeEvidence, requireValidEvidence } from "./evidence.js";
import { isSemanticallySafe } from "./semanticValidation.js";
import { currentPatientStatements, deterministicIntake, rememberQuestion } from "./deterministicIntake.js";
import type { ConversationSession, PatientMessage, SessionStore } from "./sessionStore.js";

export type ModelProvider = {
  configured: boolean;
  model: string;
  reply(messages: PatientMessage[], safety: SafetyResult): Promise<unknown>;
  handoff(messages: PatientMessage[], safety: SafetyResult): Promise<unknown>;
};

export type ProviderMode = "live" | "offline" | "deterministic";

function logProviderFallback(operation: "reply" | "handoff", error: unknown) {
  const candidate = error as { status?: unknown; code?: unknown };
  console.warn("[medrelay] using offline fallback", {
    operation,
    status: typeof candidate.status === "number" ? candidate.status : "unknown",
    code: typeof candidate.code === "string" ? candidate.code.slice(0, 64) : "unknown",
    errorType: error instanceof Error ? error.name : "unknown",
  });
}

const appointment = { requested: false, reason: null, recommendedSpecialty: null, confirmationRequired: true as const, booked: false as const };
const noEvidenceReply = (
  message: string,
  safety: SafetyResult,
  messages: PatientMessage[] = [],
  followUpQuestion: string | null = null,
  informationGaps: string[] = []
): ConversationReply => ({
  message, followUpQuestion, informationGaps,
  careLevel: safety.careLevel, careRationale: "Deterministic patient-only safety screening result.",
  warningSigns: safety.warningSigns, emergencyGuidance: safety.emergencyGuidance,
  appointmentHandoff: appointment, evidence: dedupeEvidence([...safety.evidence, ...latestDirectEvidence(messages)]),
  clinicianReviewRequired: true, limitations: LIMITATION,
});

function latestDirectEvidence(messages: PatientMessage[]) {
  return messages.map(message => ({ sourceMessageId: message.id, quote: message.content.slice(0, 500), kind: "direct" as const, requiresConfirmation: false, targetField: "reportedSymptoms" as const }));
}

function offlineIntakeReply(session: ConversationSession, messages: PatientMessage[], safety: SafetyResult, message: string): { reply: ConversationReply; nextState: ConversationSession["intake"] } {
  const intake = deterministicIntake(messages, session.intake);
  const nextState = rememberQuestion(session.intake, intake);
  return {
    reply: noEvidenceReply(message, safety, messages, intake.followUpQuestion, intake.informationGaps),
    nextState,
  };
}

function offlineHandoff(messages: PatientMessage[], safety: SafetyResult, session?: ConversationSession): ClinicianHandoff {
  const currentStatements = currentPatientStatements(messages).map(message => message.content);
  const intake = deterministicIntake(messages, session?.intake);
  return {
    title: "Clinician-review symptom-intake draft",
    summary: currentStatements.length ? `Patient-reported statements: ${currentStatements.join(" | ")}` : "No patient statement provided.",
    reportedSymptoms: currentStatements, timeline: null, relevantHistory: [], reportedMedications: [], reportedAllergies: [],
    informationGaps: intake.informationGaps,
    warningSigns: safety.warningSigns, careLevel: safety.careLevel,
    careRationale: "Deterministic patient-only safety screening; clinical interpretation is still required.",
    emergencyGuidance: safety.emergencyGuidance,
    patientNextSteps: safety.careLevel === "emergency_services" ? [safety.emergencyGuidance!] : ["Review and edit this draft before sharing it with a clinician."],
    questionsForClinician: ["What additional history or examination is needed?"],
    appointmentHandoff: appointment, evidence: dedupeEvidence([...latestDirectEvidence(messages), ...safety.evidence]),
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
    // Migrate sessions created before deterministic intake state was persisted.
    if (!session.intake) session.intake = { category: "general", askedFields: [] };
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
      reply = noEvidenceReply(safety.emergencyGuidance!, safety, patients, null, []);
    } else if (containsPromptInjection(patients.map(m => m.content))) {
      reply = noEvidenceReply("I can only help capture patient-reported information for a clinician-review draft. Please describe the health concern in your own words.", safety, patients, "What symptom or concern would you like to record?", ["A patient-authored symptom statement"]);
    } else if (!this.provider.configured) {
      providerMode = "offline";
      const intakeReply = offlineIntakeReply(session, patients, safety, "MedRelay captured your statement and prepared an editable clinician-review draft. Continue with the focused follow-up below.");
      session.intake = intakeReply.nextState;
      reply = intakeReply.reply;
    } else {
      try {
        const parsed = ConversationReplySchema.parse(await this.provider.reply(patients, safety));
        if (!isSemanticallySafe([JSON.stringify(parsed)])) throw new Error("UNSAFE_MODEL_OUTPUT");
        requireValidEvidence(parsed.evidence, patients);
        if (safety.careLevel === "urgent_clinician_review" && parsed.careLevel === "routine_clinician_review") throw new Error("URGENCY_DOWNGRADE");
        reply = { ...parsed, careLevel: safety.careLevel === "urgent_clinician_review" ? safety.careLevel : parsed.careLevel,
          warningSigns: [...new Set([...safety.warningSigns, ...parsed.warningSigns])], evidence: dedupeEvidence([...safety.evidence, ...parsed.evidence]) };
        providerMode = "live";
      } catch (error) {
        logProviderFallback("reply", error);
        const intakeReply = offlineIntakeReply(session, patients, safety, "MedRelay captured your statement and prepared an editable clinician-review draft. Continue with the focused follow-up below.");
        session.intake = intakeReply.nextState;
        reply = intakeReply.reply;
        providerMode = "offline";
      }
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
      draft = offlineHandoff(patients, safety, session);
      providerMode = safety.careLevel === "emergency_services" ? "deterministic" : "offline";
    } else {
      try {
        draft = ClinicianHandoffSchema.parse(await this.provider.handoff(patients, safety));
        if (!isSemanticallySafe([JSON.stringify(draft)])) throw new Error("UNSAFE_MODEL_OUTPUT");
        requireValidEvidence(draft.evidence, patients);
        if (safety.careLevel === "urgent_clinician_review" && draft.careLevel === "routine_clinician_review") throw new Error("URGENCY_DOWNGRADE");
        draft = { ...draft, careLevel: safety.careLevel === "routine_clinician_review" ? draft.careLevel : safety.careLevel,
          warningSigns: [...new Set([...safety.warningSigns, ...draft.warningSigns])], evidence: dedupeEvidence([...safety.evidence, ...draft.evidence]) };
        providerMode = "live";
      } catch (error) {
        logProviderFallback("handoff", error);
        draft = offlineHandoff(patients, safety, session);
        providerMode = "offline";
      }
    }
    draft = { ...draft, evidence: dedupeEvidence(draft.evidence) };
    requireValidEvidence(draft.evidence, patients);
    return { draft, safety, providerMode, transcript: patients,
      state: { storyCaptured: true, safetyChecked: true, evidenceVerified: true, handoffReady: true } };
  }

  async reset(id: string, token: string, ownerKey: string) { return { deleted: await this.sessions.delete(id, token, ownerKey) }; }
}

function requireEvidenceIssue(evidence: ClinicianHandoff["evidence"][number], patients: PatientMessage[]) {
  try { requireValidEvidence([evidence], patients); return false; } catch { return true; }
}

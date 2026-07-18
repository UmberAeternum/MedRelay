import { ClinicianHandoffSchema, ConversationReplySchema, LIMITATION, type ClinicianHandoff, type ConversationReply } from "./schemas.js";
import { containsPromptInjection, screenPatientSafety, type SafetyResult } from "./safety.js";
import { requireValidEvidence } from "./evidence.js";
import { isSemanticallySafe } from "./semanticValidation.js";
import type { ConversationSession, PatientMessage, SessionStore } from "./sessionStore.js";

export type ModelProvider = {
  configured: boolean;
  model: string;
  reply(messages: PatientMessage[], safety: SafetyResult): Promise<unknown>;
  handoff(messages: PatientMessage[], safety: SafetyResult): Promise<unknown>;
};

export type ProviderMode = "live" | "offline" | "deterministic";

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
  appointmentHandoff: appointment, evidence: [...safety.evidence, ...latestDirectEvidence(messages)],
  clinicianReviewRequired: true, limitations: LIMITATION,
});

function latestDirectEvidence(messages: PatientMessage[]) {
  return messages.map(message => ({ sourceMessageId: message.id, quote: message.content.slice(0, 500), kind: "direct" as const, requiresConfirmation: false, targetField: "reportedSymptoms" as const }));
}

function deterministicGaps(messages: PatientMessage[]) {
  const text = messages.map(message => message.content).join(" ");
  const gaps: string[] = [];
  if (!/(?:today|yesterday|morning|evening|night|since|started|began|day|week|month|कल|आज|सुबह|से|नిన్న|ఈరోజు|నుంచి|రోజు|వారం)/i.test(text)) gaps.push("Onset and duration");
  if (!/(?:where|location|left|right|upper|lower|back|chest|stomach|head|pain in|कहाँ|दर्द|पेट|सीने|सिर|ఎక్కడ|నొప్పి|కడుపు|తల)/i.test(text)) gaps.push("Location or affected area");
  if (!/(?:mild|moderate|severe|intense|scale|out of 10|हल्का|तेज|तीव्र|दर्द कितना|తీవ్ర|తక్కువ|10లో)/i.test(text)) gaps.push("Severity and change over time");
  if (!/(?:history|condition|surgery|pregnan|diabet|asthma|medical|इतिहास|बीमारी|ऑपरेशन|गर्भ|చరిత్ర|వ్యాధి|శస్త్ర)/i.test(text)) gaps.push("Relevant health history");
  if (!/(?:medication|medicine|drug|tablet|allerg|दवा|एलर्जी| మందు|అలెర్జీ)/i.test(text)) gaps.push("Current medicines and allergies");
  return gaps.slice(0, 5);
}

function deterministicQuestion(gaps: string[]) {
  const first = gaps[0];
  if (first === "Onset and duration") return "When did this begin, and has it changed since it started?";
  if (first === "Location or affected area") return "Where do you feel it, and does it move anywhere else?";
  if (first === "Severity and change over time") return "How severe is it right now, and is it getting better or worse?";
  if (first === "Relevant health history") return "Is there any relevant health history or recent event a clinician should know about?";
  if (first === "Current medicines and allergies") return "What medicines or allergies should be included in the clinician-review draft?";
  return null;
}

function offlineHandoff(messages: PatientMessage[], safety: SafetyResult): ClinicianHandoff {
  const statements = messages.map(m => m.content);
  const correctionIndex = messages.findLastIndex(message => /^(?:actually|correction:|i meant|असल में|నిజానికి)/i.test(message.content.trim()));
  const currentStatements = correctionIndex >= 0 ? statements.slice(correctionIndex) : statements;
  return {
    title: "Clinician-review symptom-intake draft",
    summary: currentStatements.length ? `Patient-reported statements: ${currentStatements.join(" | ")}` : "No patient statement provided.",
    reportedSymptoms: currentStatements, timeline: null, relevantHistory: [], reportedMedications: [], reportedAllergies: [],
    informationGaps: deterministicGaps(messages),
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
      reply = noEvidenceReply(safety.emergencyGuidance!, safety, patients, null, []);
    } else if (containsPromptInjection(patients.map(m => m.content))) {
      reply = noEvidenceReply("I can only help capture patient-reported information for a clinician-review draft. Please describe the health concern in your own words.", safety, patients, "What symptom or concern would you like to record?", ["A patient-authored symptom statement"]);
    } else if (!this.provider.configured) {
      providerMode = "offline";
      const gaps = deterministicGaps(patients);
      reply = noEvidenceReply("AI generation is unavailable. I captured your statement ephemerally and can only collect neutral details for clinician review.", safety, patients, deterministicQuestion(gaps), gaps);
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

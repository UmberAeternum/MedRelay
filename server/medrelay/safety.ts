import type { CareLevel, EvidenceReference } from "./schemas.js";
import type { PatientMessage, TrustedMessage } from "./sessionStore.js";

export type SafetyResult = {
  careLevel: CareLevel;
  warningSigns: string[];
  emergencyGuidance: string | null;
  evidence: EvidenceReference[];
  checkedAt: string;
  policyVersion: "2026-07-17";
};

type Finding = { label: string; quote: string; messageId: string };
const NEGATION = /(?:\bno\b|\bnot\b|\bwithout\b|\bnever\b|\bdo not\b|\bdon't\b|\bnahi\b|\bnahin\b|नहीं|लेदु)/iu;

function unnegatedMatch(text: string, pattern: RegExp): RegExpExecArray | null {
  const matcher = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  for (const match of text.matchAll(matcher)) {
    const prefix = text.slice(Math.max(0, (match.index ?? 0) - 48), match.index);
    if (!NEGATION.test(prefix)) return match as RegExpExecArray;
  }
  return null;
}

function find(messages: PatientMessage[], pattern: RegExp): Finding | null {
  for (const message of messages) {
    const match = unnegatedMatch(message.content, pattern);
    if (match) return { label: match[0], quote: message.content.slice(0, 500), messageId: message.id };
  }
  return null;
}

function combinedFinding(messages: PatientMessage[], label: string, first: RegExp, second: RegExp): Finding | null {
  for (const message of messages) if (unnegatedMatch(message.content, first) && unnegatedMatch(message.content, second)) return { label, quote: message.content.slice(0, 500), messageId: message.id };
  return null;
}

const BREATHING = /cannot (?:breathe|catch my breath)|severe (?:shortness of breath|breathing difficulty)|trouble breathing|shortness of breath|saans nahi aa|सांस नहीं|oopiri aadatledu|ఊపిరి ఆడటం లేదు/i;
const CHEST = /chest (?:pain|pressure|discomfort)|seene me dard|सीने[\s\S]{0,20}दर्द|chaati noppi|ఛాతి నొప్పి/i;
const FAINT = /faint(?:ed|ing)?|collapse|passed out|behosh|बेहोश|స్పృహ తప్ప/i;
const CONFUSION = /new confusion|sudden confusion|trouble speaking|slurred speech|cannot speak|difficulty speaking|बोलने में कठिनाई|మాట్లాడలేక/i;
const BLEEDING = /severe bleeding|bleeding (?:a lot|heavily)|vomit(?:ing)? blood|blood loss|खून[\s\S]{0,20}की उल्टी|తీవ్రమైన రక్తస్రావం/i;
const SUDDEN_HEADACHE = /sudden(?:ly)? (?:severe|worst).*?(?:headache|head pain)|worst headache/i;
const HEADACHE = /headache|head pain|sir dard|सिरदर्द|thalanoppi|తలనొప్పి/i;
const VOMITING = /vomit(?:ing|ed)?|threw up|ulti|उल्टी|vaanthi|వాంతి/i;
const LIGHT = /light (?:hurts|sensitivity)|bright light|photophobia|roshni se|रोशनी से|veluthuru|వెలుతురు/i;
const WEAKNESS = /new weakness|weakness on one side|one-sided weakness|arm or leg feels weak|एक तरफ कमजोरी|ఒక వైపు బలహీనత/i;
const SEVERE_ABDOMINAL = /severe (?:abdominal|stomach) pain|very bad stomach pain|पेट में बहुत दर्द|తీవ్రమైన కడుపు నొప్పి/i;

function evidence(finding: Finding): EvidenceReference {
  return { sourceMessageId: finding.messageId, quote: finding.quote, kind: "direct", requiresConfirmation: false, targetField: "warningSigns" };
}

export function screenPatientSafety(input: TrustedMessage[]): SafetyResult {
  const messages = input.filter((message): message is PatientMessage => message.role === "patient");
  const emergency: Finding[] = [];
  const breathing = find(messages, BREATHING);
  if (breathing) emergency.push({ ...breathing, label: "severe breathing difficulty" });
  const chestFaint = combinedFinding(messages, "chest discomfort with faintness", CHEST, FAINT);
  if (chestFaint) emergency.push(chestFaint);
  const confusion = find(messages, CONFUSION);
  if (confusion) emergency.push({ ...confusion, label: "new confusion or speech difficulty" });
  const bleeding = find(messages, BLEEDING);
  if (bleeding) emergency.push({ ...bleeding, label: "severe bleeding" });
  const suddenHeadache = find(messages, SUDDEN_HEADACHE);
  if (suddenHeadache) emergency.push({ ...suddenHeadache, label: "sudden severe headache" });
  const weaknessConfusion = combinedFinding(messages, "one-sided weakness with speech or confusion changes", WEAKNESS, CONFUSION);
  if (weaknessConfusion) emergency.push(weaknessConfusion);
  const abdominalFaint = combinedFinding(messages, "severe abdominal pain with faintness", SEVERE_ABDOMINAL, FAINT);
  if (abdominalFaint) emergency.push(abdominalFaint);

  if (emergency.length > 0) return {
    careLevel: "emergency_services",
    warningSigns: emergency.map(item => item.label),
    emergencyGuidance: "Potential warning signs were reported. Seek emergency care or contact local emergency services now; do not wait for this intake.",
    evidence: emergency.map(evidence), checkedAt: new Date().toISOString(), policyVersion: "2026-07-17",
  };

  const urgent: Finding[] = [];
  for (const message of messages) {
    const headache = unnegatedMatch(message.content, HEADACHE);
    const vomiting = unnegatedMatch(message.content, VOMITING);
    const light = unnegatedMatch(message.content, LIGHT);
    if (headache && (vomiting || light)) urgent.push({ label: "headache with vomiting or light sensitivity", quote: message.content.slice(0, 500), messageId: message.id });
  }
  const weakness = find(messages, WEAKNESS);
  if (weakness) urgent.push({ ...weakness, label: "new one-sided weakness" });
  return {
    careLevel: urgent.length ? "urgent_clinician_review" : messages.length ? "routine_clinician_review" : "collect_more_information",
    warningSigns: urgent.map(item => item.label), emergencyGuidance: null, evidence: urgent.map(evidence),
    checkedAt: new Date().toISOString(), policyVersion: "2026-07-17",
  };
}

const INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+|the\s+|previous\s+|prior\s+)?(?:instructions|rules|policy)/i,
  /reveal\s+(?:the\s+)?(?:system\s+|developer\s+)?prompt/i,
  /(?:act|pretend)\s+as\s+(?:a\s+)?(?:different|new|unrestricted|system)/i,
  /(?:override|bypass|disable)\s+(?:the\s+)?(?:safety|policy|schema|rules)/i,
  /jailbreak|developer message|system message/i,
  /निर्देशों?\s+को\s+अनदेखा|सिस्टम\s+प्रॉम्प्ट/i,
  /సూచనలను\s+విస్మరించు|సిస్టమ్\s+ప్రాంప్ట్/i,
  /nirdeshalu\s+marchu|niyamalu\s+pattinchukoku/i,
];

export function containsPromptInjection(texts: string[]): boolean {
  return texts.some(text => INJECTION_PATTERNS.some(pattern => pattern.test(text)));
}

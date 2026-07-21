import type { EvidenceReference } from "./schemas.js";
import type { PatientMessage } from "./sessionStore.js";

const normalize = (value: string) => value.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();

export function validateEvidence(evidence: EvidenceReference[], messages: PatientMessage[]): string[] {
  const source = new Map(messages.map(message => [message.id, message.content]));
  const issues: string[] = [];
  for (const item of evidence) {
    const original = source.get(item.sourceMessageId);
    if (!original) { issues.push(`Unknown patient message: ${item.sourceMessageId}`); continue; }
    if (item.kind === "direct" && !normalize(original).includes(normalize(item.quote))) {
      issues.push(`Direct quote does not resolve: ${item.sourceMessageId}`);
    }
    if (item.kind !== "direct" && !item.requiresConfirmation) {
      issues.push(`Non-direct evidence requires confirmation: ${item.sourceMessageId}`);
    }
  }
  return issues;
}

export function requireValidEvidence(evidence: EvidenceReference[], messages: PatientMessage[]) {
  const issues = validateEvidence(evidence, messages);
  if (issues.length) throw new Error("INVALID_EVIDENCE");
}

/** Remove duplicate references without touching the patient transcript or correction audit. */
export function dedupeEvidence(evidence: EvidenceReference[]): EvidenceReference[] {
  const seen = new Set<string>();
  return evidence.filter(item => {
    const key = [item.sourceMessageId, item.targetField, item.kind, normalize(item.quote)].join("\u0000");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

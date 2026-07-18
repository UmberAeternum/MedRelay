import { describe, expect, it, vi } from "vitest";
import { LIMITATION } from "./schemas";
import { MedRelayService, type ModelProvider } from "./service";
import { DemoSessionStore } from "./sessionStore";

const provider: ModelProvider = { configured: false, model: "gpt-5.6", reply: vi.fn(), handoff: vi.fn() };
const examples = [
  ["fever and cough", "I have a fever and cough"],
  ["abdominal discomfort", "My stomach feels uncomfortable"],
  ["nausea and bowel symptoms", "I feel nauseated and have loose stools"],
  ["urinary symptoms", "It burns when I urinate"],
  ["rash", "I have an itchy rash"],
  ["dizziness", "I feel dizzy when I stand"],
  ["injury and pain", "I twisted my ankle and it hurts"],
  ["weakness", "My legs feel weak"],
  ["multilingual mixed input", "Morning nunchi headache undi and mujhe chakkar aa rahe hain"],
] as const;

async function startService() {
  const service = new MedRelayService(new DemoSessionStore(), provider);
  const session = await service.start("test-owner");
  return { service, session };
}

describe("broad deterministic symptom intake", () => {
  it.each(examples)("accepts arbitrary %s input without diagnosing", async (_label, text) => {
    const { service, session } = await startService();
    const result = await service.continue(session.conversationId, session.accessToken, "test-owner", text);
    expect(result.providerMode).toBe("offline");
    expect(result.reply.message).not.toMatch(/diagnos|prescri|probability|dosage|booked/i);
    expect(result.reply.limitations).toBe(LIMITATION);
    expect(result.reply.followUpQuestion).toBeTruthy();
    expect(result.reply.informationGaps.length).toBeGreaterThan(0);
    expect(result.reply.evidence[0]?.sourceMessageId).toBe(result.patientMessage.id);
  });

  it("keeps a focused follow-up separate from the assistant message", async () => {
    const { service, session } = await startService();
    const result = await service.continue(session.conversationId, session.accessToken, "test-owner", "I have a cough");
    expect(result.reply.followUpQuestion).toBeTruthy();
    expect(result.assistantMessage.content).not.toContain(result.reply.followUpQuestion!);
  });

  it("preserves correction audit evidence while superseding current draft facts", async () => {
    const { service, session } = await startService();
    await service.continue(session.conversationId, session.accessToken, "test-owner", "The stomach pain started Monday");
    await service.continue(session.conversationId, session.accessToken, "test-owner", "Correction: it started Tuesday");
    const handoff = await service.handoff(session.conversationId, session.accessToken, "test-owner");
    expect(handoff.draft.reportedSymptoms).toEqual(["Correction: it started Tuesday"]);
    expect(handoff.transcript).toHaveLength(2);
    expect(handoff.draft.evidence.map(item => item.sourceMessageId)).toHaveLength(2);
  });
});

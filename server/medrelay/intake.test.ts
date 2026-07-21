import { describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { LIMITATION } from "./schemas";
import { MedRelayService, type ModelProvider } from "./service";
import { DemoSessionStore } from "./sessionStore";
import { dedupeEvidence } from "./evidence";
import { deterministicIntake, UNMAPPED_MESSAGE } from "./deterministicIntake";
import { OpenAIMedRelayProvider } from "../_core/openai";

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

  it.each([
    ["respiratory", "I have fever and cough"],
    ["digestive", "My stomach hurts and I feel nauseated"],
    ["urinary", "It burns when I urinate"],
    ["skin", "I have an itchy rash"],
    ["neurological", "I feel dizzy when I stand"],
    ["injury", "I twisted my ankle and it hurts"],
    ["general", "I feel unwell and tired"],
  ] as const)("uses the %s category state machine", (category, text) => {
    const message = { id: randomUUID(), role: "patient" as const, content: text, createdAt: new Date().toISOString() };
    expect(deterministicIntake([message]).category).toBe(category);
  });

  it("asks respiratory questions in order and never asks a pain-location question", async () => {
    const { service, session } = await startService();
    const first = await service.continue(session.conversationId, session.accessToken, "test-owner", "I have fever and cough");
    expect(first.reply.followUpQuestion).toContain("When did");
    expect(first.reply.followUpQuestion).not.toMatch(/where.*feel|move anywhere/i);
    const second = await service.continue(session.conversationId, session.accessToken, "test-owner", "It began yesterday");
    expect(second.reply.followUpQuestion).toContain("How severe");
    expect(second.reply.followUpQuestion).not.toMatch(/where.*feel|move anywhere/i);
    expect(second.reply.informationGaps).toContain("Measured temperature");
  });

  it("does not repeat a previously asked question when an answer is still incomplete", async () => {
    const { service, session } = await startService();
    const first = await service.continue(session.conversationId, session.accessToken, "test-owner", "I have a cough");
    const second = await service.continue(session.conversationId, session.accessToken, "test-owner", "I am not sure");
    expect(second.reply.followUpQuestion).not.toBe(first.reply.followUpQuestion);
  });

  it("preserves negations as patient wording without creating a warning sign", async () => {
    const { service, session } = await startService();
    const result = await service.continue(session.conversationId, session.accessToken, "test-owner", "I have a cough but no trouble breathing and no chest pain");
    expect(result.safety.careLevel).toBe("routine_clinician_review");
    const handoff = await service.handoff(session.conversationId, session.accessToken, "test-owner");
    expect(handoff.draft.reportedSymptoms[0]).toContain("no trouble breathing");
  });

  it("keeps emergency screening ahead of category intake and provider calls", async () => {
    const called = vi.fn();
    const service = new MedRelayService(new DemoSessionStore(), { configured: true, model: "gpt-5.6", reply: called, handoff: called });
    const session = await service.start("test-owner");
    const result = await service.continue(session.conversationId, session.accessToken, "test-owner", "I have severe trouble breathing");
    expect(result.providerMode).toBe("deterministic");
    expect(result.safety.careLevel).toBe("emergency_services");
    expect(called).not.toHaveBeenCalled();
  });

  it("deduplicates evidence references while retaining distinct correction messages", () => {
    const evidence = [{ sourceMessageId: "00000000-0000-4000-8000-000000000001", quote: "Cough", kind: "direct" as const, requiresConfirmation: false, targetField: "reportedSymptoms" as const }, { sourceMessageId: "00000000-0000-4000-8000-000000000001", quote: " cough ", kind: "direct" as const, requiresConfirmation: false, targetField: "reportedSymptoms" as const }, { sourceMessageId: "00000000-0000-4000-8000-000000000002", quote: "Correction: cough", kind: "direct" as const, requiresConfirmation: false, targetField: "reportedSymptoms" as const }];
    expect(dedupeEvidence(evidence)).toHaveLength(2);
  });

  it.each([
    "Morning nunchi jvaram and daggu undi",
    "मुझे कल से पेट में परेशानी और मितली है",
    "నిన్నటి నుంచి జ్వరం మరియు దగ్గు ఉంది",
    "Morning nunchi headache undi and mujhe chakkar aa rahe hain",
  ])("accepts multilingual or mixed-language patient wording: %s", async text => {
    const { service, session } = await startService();
    const result = await service.continue(session.conversationId, session.accessToken, "test-owner", text);
    expect(result.providerMode).toBe("offline");
    expect(result.reply.followUpQuestion).toBeTruthy();
    expect(result.reply.limitations).toBe(LIMITATION);
  });

  it("keeps the external provider disabled in the zero-cost mode and restores environment state", async () => {
    vi.stubEnv("MEDRELAY_LIVE_PROVIDER", "false");
    vi.stubEnv("OPENAI_API_KEY", "synthetic-test-value");
    try {
      const model = new OpenAIMedRelayProvider();
      expect(model.configured).toBe(false);
      await expect(model.reply([], { careLevel: "collect_more_information", warningSigns: [], emergencyGuidance: null, evidence: [], checkedAt: new Date().toISOString(), policyVersion: "2026-07-17" })).rejects.toThrow("MODEL_UNAVAILABLE");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("gives a first-turn introduction, then different fact acknowledgements and questions", async () => {
    const { service, session } = await startService();
    const first = await service.continue(session.conversationId, session.accessToken, "test-owner", "I have fever and cough");
    const second = await service.continue(session.conversationId, session.accessToken, "test-owner", "fever for a couple of days");
    const third = await service.continue(session.conversationId, session.accessToken, "test-owner", "moderate");
    expect(first.reply.message).toBe("MedRelay captured your statement and prepared an editable clinician-review draft. Continue with the focused follow-up below.");
    expect(second.reply.message).toBe("Recorded: fever lasting a couple of days.");
    expect(third.reply.message).toBe("Recorded: severity and change.");
    expect(new Set([first.reply.message, second.reply.message, third.reply.message]).size).toBe(3);
    expect(second.reply.informationGaps).not.toContain("Onset and duration");
    expect(second.reply.followUpQuestion).not.toBe(first.reply.followUpQuestion);
    expect(third.reply.followUpQuestion).not.toBe(second.reply.followUpQuestion);
  });

  it("recognizes repeated information and repeats only the next focused question", async () => {
    const { service, session } = await startService();
    await service.continue(session.conversationId, session.accessToken, "test-owner", "fever for a couple of days");
    const repeated = await service.continue(session.conversationId, session.accessToken, "test-owner", "fever for a couple of days");
    expect(repeated.reply.message).toBe("That information is already recorded. Please answer the focused question below.");
    expect(repeated.reply.followUpQuestion).toContain("If you measured your temperature");
  });

  it("handles unrelated text without inventing a field or fact", async () => {
    const { service, session } = await startService();
    await service.continue(session.conversationId, session.accessToken, "test-owner", "I have fever and cough");
    const result = await service.continue(session.conversationId, session.accessToken, "test-owner", "The blue train is late");
    expect(result.reply.message).toBe(UNMAPPED_MESSAGE);
    expect(result.reply.followUpQuestion).toContain("How severe");
    expect(result.reply.evidence.at(-1)?.quote).toContain("The blue train is late");
  });

  it("acknowledges negative respiratory answers without turning them positive", async () => {
    const { service, session } = await startService();
    await service.continue(session.conversationId, session.accessToken, "test-owner", "fever and cough");
    const result = await service.continue(session.conversationId, session.accessToken, "test-owner", "temperature 38°C; breathing difficulty and chest discomfort denied");
    expect(result.reply.message).toBe("Recorded: temperature 38°C; breathing difficulty and chest discomfort denied.");
    expect(result.safety.warningSigns).toEqual([]);
    expect(result.reply.informationGaps).not.toContain("Breathing");
    expect(result.reply.informationGaps).not.toContain("Chest discomfort");
  });

  it.each([
    "fever for two days",
    "fever for a couple of days",
    "fever for few days",
    "fever since yesterday",
    "fever for one week",
    "बुखार दो दिन से है",
    "ज्वर कुछ दिन से है",
    "జ్వరం రెండు రోజులు ఉంది",
    "jvaram konni rojulu nundi undi",
  ])("maps duration form to onset without inventing facts: %s", text => {
    const message = { id: randomUUID(), role: "patient" as const, content: text, createdAt: new Date().toISOString() };
    expect(deterministicIntake([message]).answeredFields).toContain("onset");
  });
});

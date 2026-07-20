import http from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApiApp } from "../_core/app";
import { FixedWindowRateLimiter } from "./rateLimit";
import type { ModelProvider } from "./service";
import { DemoSessionStore } from "./sessionStore";

type TrpcEnvelope = { json?: unknown };
type JsonRecord = Record<string, unknown>;

let server: http.Server;
let baseUrl = "";
let providerCalls = 0;

const offlineProvider: ModelProvider = {
  configured: false,
  model: "test-offline",
  async reply() {
    providerCalls += 1;
    throw new Error("TEST_PROVIDER_MUST_NOT_BE_CALLED");
  },
  async handoff() {
    providerCalls += 1;
    throw new Error("TEST_PROVIDER_MUST_NOT_BE_CALLED");
  },
};

async function callMutation(path: string, input: unknown): Promise<{ response: Response; body: unknown }> {
  const response = await fetch(`${baseUrl}/api/trpc/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ json: input } satisfies TrpcEnvelope),
  });
  const body = await response.json();
  return { response, body };
}

function resultData(body: unknown): JsonRecord {
  if (!body || typeof body !== "object") throw new Error("tRPC response was not an object");
  const result = (body as JsonRecord).result;
  if (!result || typeof result !== "object") throw new Error("tRPC response did not contain a result");
  const data = (result as JsonRecord).data;
  if (!data || typeof data !== "object") throw new Error("tRPC response did not contain data");
  const json = (data as JsonRecord).json;
  return (json && typeof json === "object" ? json : data) as JsonRecord;
}

beforeAll(async () => {
  const sessionStore = new DemoSessionStore();
  const limiter = new FixedWindowRateLimiter(100, 60_000);
  server = http.createServer(createApiApp({
    medrelay: { sessionStore, provider: offlineProvider, limiter },
  }));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("HTTP smoke server did not bind");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

describe("Vercel-shaped tRPC HTTP surface", () => {
  it("starts and continues a demo session with JSON responses", async () => {
    const start = await callMutation("medrelay.start", null);
    expect(start.response.status).toBe(200);
    expect(start.response.headers.get("content-type")).toMatch(/application\/json/);
    expect(start.body).not.toHaveProperty("html");

    const session = resultData(start.body);
    const conversationId = session.conversationId;
    const accessToken = session.accessToken;
    expect(conversationId).toEqual(expect.any(String));
    expect(accessToken).toEqual(expect.any(String));

    const continuation = await callMutation("medrelay.continue", {
      conversationId,
      accessToken,
      message: "Synthetic cough and fever since yesterday.",
    });
    expect(continuation.response.status).toBe(200);
    expect(continuation.response.headers.get("content-type")).toMatch(/application\/json/);
    expect(resultData(continuation.body)).toMatchObject({
      patientMessage: { content: "Synthetic cough and fever since yesterday." },
    });
    expect(providerCalls).toBe(0);
  });

  it("returns deterministic emergency guidance without a GPT provider response", async () => {
    const start = await callMutation("medrelay.start", null);
    const session = resultData(start.body);
    const conversationId = session.conversationId;
    const accessToken = session.accessToken;
    const emergency = await callMutation("medrelay.continue", {
      conversationId,
      accessToken,
      message: "Sudden severe chest pain, trouble breathing, and I fainted.",
    });
    const data = resultData(emergency.body);
    expect(emergency.response.status).toBe(200);
    expect(emergency.response.headers.get("content-type")).toMatch(/application\/json/);
    expect(["offline", "deterministic"]).toContain(data.providerMode);
    const reply = data.reply;
    expect(reply && typeof reply === "object" ? reply : {}).toMatchObject({ careLevel: "emergency_services" });
    const warningSigns = reply && typeof reply === "object" ? (reply as JsonRecord).warningSigns : undefined;
    expect(Array.isArray(warningSigns)).toBe(true);
    expect((warningSigns as unknown[]).length).toBeGreaterThan(0);
    expect(data).not.toHaveProperty("diagnosis");
    expect(providerCalls).toBe(0);
  });
});

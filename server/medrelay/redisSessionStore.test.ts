import { afterEach, describe, expect, it, vi } from "vitest";
import { RedisDemoSessionStore } from "./redisSessionStore";

afterEach(() => vi.unstubAllGlobals());

function fakeRedis() {
  const values = new Map<string, string>();
  return vi.fn(async (_url: string, init?: RequestInit) => {
    const [command, key, value] = JSON.parse(String(init?.body)) as [string, string, string?];
    let result: string | number | null = null;
    if (command === "SET" && value !== undefined) { values.set(key, value); result = "OK"; }
    if (command === "GET") result = values.get(key) ?? null;
    if (command === "DEL") result = values.delete(key) ? 1 : 0;
    return { ok: true, json: async () => ({ result }) };
  });
}

describe("Redis demo sessions", () => {
  it("survives a fresh serverless store instance", async () => {
    vi.stubGlobal("fetch", fakeRedis());
    const first = new RedisDemoSessionStore("https://redis.example", "token");
    const { session, accessToken } = await first.create("owner");
    first.appendPatient(session, "headache since morning");
    await first.save(session);

    const freshInstance = new RedisDemoSessionStore("https://redis.example", "token");
    const restored = await freshInstance.get(session.id, accessToken, "owner");
    expect(restored?.messages).toHaveLength(1);
    expect(restored?.messages[0]?.content).toBe("headache since morning");
  });

  it("preserves access-token and owner isolation", async () => {
    vi.stubGlobal("fetch", fakeRedis());
    const store = new RedisDemoSessionStore("https://redis.example", "token");
    const { session, accessToken } = await store.create("owner");
    expect(await store.get(session.id, "x".repeat(accessToken.length), "owner")).toBeNull();
    expect(await store.get(session.id, accessToken, "other-owner")).toBeNull();
  });
});

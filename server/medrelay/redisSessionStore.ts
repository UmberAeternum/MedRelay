import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { AssistantMessage, ConversationSession, PatientMessage, SessionStore } from "./sessionStore.js";

type StoredSession = Omit<ConversationSession, "tokenHash"> & { tokenHash: string };

const digest = (value: string) => createHash("sha256").update(value).digest();

export class RedisDemoSessionStore implements SessionStore {
  readonly kind = "upstash-redis" as const;
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly ttlSeconds = 30 * 60,
    private readonly maxMessages = 30,
  ) {}

  static fromEnv(): RedisDemoSessionStore | null {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    return url && token ? new RedisDemoSessionStore(url, token) : null;
  }

  private key(id: string) { return `medrelay:demo:${id}`; }

  private async command<T>(command: unknown[]): Promise<T> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error("SESSION_STORE_UNAVAILABLE");
    const payload = await response.json() as { result?: T; error?: string };
    if (payload.error) throw new Error("SESSION_STORE_UNAVAILABLE");
    return payload.result as T;
  }

  private serialize(session: ConversationSession): string {
    return JSON.stringify({ ...session, tokenHash: session.tokenHash.toString("base64") } satisfies StoredSession);
  }

  private deserialize(value: string): ConversationSession {
    const parsed = JSON.parse(value) as StoredSession;
    return { ...parsed, tokenHash: Buffer.from(parsed.tokenHash, "base64") };
  }

  async create(ownerKey: string) {
    const accessToken = randomBytes(32).toString("base64url");
    const now = Date.now();
    const session: ConversationSession = {
      id: randomUUID(), ownerKey, tokenHash: digest(accessToken), messages: [],
      createdAt: now, expiresAt: now + this.ttlSeconds * 1_000,
    };
    await this.save(session);
    return { session, accessToken };
  }

  async get(id: string, accessToken: string, ownerKey: string) {
    const raw = await this.command<string | null>(["GET", this.key(id)]);
    if (!raw) return null;
    const session = this.deserialize(raw);
    const supplied = digest(accessToken);
    if (session.ownerKey !== ownerKey || session.tokenHash.length !== supplied.length || !timingSafeEqual(session.tokenHash, supplied)) return null;
    session.expiresAt = Date.now() + this.ttlSeconds * 1_000;
    await this.save(session);
    return session;
  }

  async save(session: ConversationSession) {
    await this.command(["SET", this.key(session.id), this.serialize(session), "EX", this.ttlSeconds]);
  }

  appendPatient(session: ConversationSession, content: string): PatientMessage {
    if (session.messages.length >= this.maxMessages) throw new Error("MESSAGE_LIMIT");
    const message: PatientMessage = { id: randomUUID(), role: "patient", content, createdAt: new Date().toISOString() };
    session.messages.push(message);
    return message;
  }

  appendAssistant(session: ConversationSession, content: string): AssistantMessage {
    if (session.messages.length >= this.maxMessages) throw new Error("MESSAGE_LIMIT");
    const message: AssistantMessage = { id: randomUUID(), role: "assistant", content, createdAt: new Date().toISOString() };
    session.messages.push(message);
    return message;
  }

  async delete(id: string, accessToken: string, ownerKey: string) {
    const session = await this.get(id, accessToken, ownerKey);
    if (!session) return false;
    return (await this.command<number>(["DEL", this.key(id)])) > 0;
  }
}

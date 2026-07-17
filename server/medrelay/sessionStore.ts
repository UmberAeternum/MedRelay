import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

export type PatientMessage = { id: string; role: "patient"; content: string; createdAt: string };
export type AssistantMessage = { id: string; role: "assistant"; content: string; createdAt: string };
export type TrustedMessage = PatientMessage | AssistantMessage;

export type ConversationSession = {
  id: string;
  ownerKey: string;
  tokenHash: Buffer;
  messages: TrustedMessage[];
  createdAt: number;
  expiresAt: number;
};

export type SessionStore = {
  readonly kind: "memory" | "upstash-redis";
  create(ownerKey: string): Promise<{ session: ConversationSession; accessToken: string }> | { session: ConversationSession; accessToken: string };
  get(id: string, accessToken: string, ownerKey: string): Promise<ConversationSession | null> | ConversationSession | null;
  save(session: ConversationSession): Promise<void> | void;
  appendPatient(session: ConversationSession, content: string): PatientMessage;
  appendAssistant(session: ConversationSession, content: string): AssistantMessage;
  delete(id: string, accessToken: string, ownerKey: string): Promise<boolean> | boolean;
};

const digest = (value: string) => createHash("sha256").update(value).digest();

export class DemoSessionStore {
  readonly kind = "memory" as const;
  private readonly sessions = new Map<string, ConversationSession>();
  constructor(
    private readonly now: () => number = Date.now,
    private readonly ttlMs = 30 * 60_000,
    private readonly maxSessions = 200,
    private readonly maxMessages = 30
  ) {}

  create(ownerKey: string): { session: ConversationSession; accessToken: string } {
    this.cleanup();
    while (this.sessions.size >= this.maxSessions) {
      const oldest = [...this.sessions.values()].sort((a, b) => a.createdAt - b.createdAt)[0];
      if (!oldest) break;
      this.sessions.delete(oldest.id);
    }
    const accessToken = randomBytes(32).toString("base64url");
    const now = this.now();
    const session: ConversationSession = {
      id: randomUUID(), ownerKey, tokenHash: digest(accessToken), messages: [],
      createdAt: now, expiresAt: now + this.ttlMs,
    };
    this.sessions.set(session.id, session);
    return { session, accessToken };
  }

  get(id: string, accessToken: string, ownerKey: string): ConversationSession | null {
    this.cleanup();
    const session = this.sessions.get(id);
    if (!session || session.ownerKey !== ownerKey) return null;
    const supplied = digest(accessToken);
    if (!timingSafeEqual(session.tokenHash, supplied)) return null;
    session.expiresAt = this.now() + this.ttlMs;
    return session;
  }

  appendPatient(session: ConversationSession, content: string): PatientMessage {
    if (session.messages.length >= this.maxMessages) throw new Error("MESSAGE_LIMIT");
    const message: PatientMessage = { id: randomUUID(), role: "patient", content, createdAt: new Date(this.now()).toISOString() };
    session.messages.push(message);
    return message;
  }

  appendAssistant(session: ConversationSession, content: string): AssistantMessage {
    if (session.messages.length >= this.maxMessages) throw new Error("MESSAGE_LIMIT");
    const message: AssistantMessage = { id: randomUUID(), role: "assistant", content, createdAt: new Date(this.now()).toISOString() };
    session.messages.push(message);
    return message;
  }

  save(_session: ConversationSession) {}

  delete(id: string, accessToken: string, ownerKey: string): boolean {
    const session = this.get(id, accessToken, ownerKey);
    return session ? this.sessions.delete(id) : false;
  }

  cleanup(): number {
    let removed = 0;
    const now = this.now();
    for (const [id, session] of this.sessions) if (session.expiresAt <= now) { this.sessions.delete(id); removed++; }
    return removed;
  }

  get size() { this.cleanup(); return this.sessions.size; }
}

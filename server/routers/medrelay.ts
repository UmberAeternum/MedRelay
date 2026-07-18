import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { OpenAIMedRelayProvider } from "../_core/openai.js";
import { publicProcedure, router } from "../_core/trpc.js";
import { FixedWindowRateLimiter, RedisFixedWindowRateLimiter } from "../medrelay/rateLimit.js";
import { MedRelayService } from "../medrelay/service.js";
import { DemoSessionStore } from "../medrelay/sessionStore.js";
import { RedisDemoSessionStore } from "../medrelay/redisSessionStore.js";

const sessionStore = RedisDemoSessionStore.fromEnv() ?? new DemoSessionStore();
if (process.env.VERCEL && sessionStore.kind !== "upstash-redis") {
  console.warn("MedRelay demo sessions are using a non-durable fallback; configure the Upstash Redis integration.");
}
const service = new MedRelayService(sessionStore, new OpenAIMedRelayProvider());
const limiter = RedisFixedWindowRateLimiter.fromEnv() ?? new FixedWindowRateLimiter(20, 60_000);
const sessionInput = z.object({ conversationId: z.string().uuid(), accessToken: z.string().min(32).max(100) }).strict();

function owner(value: unknown) {
  const req = value as { ip?: string; headers?: Record<string, unknown> };
  const forwarded = req.headers?.["x-forwarded-for"];
  const candidate = typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : req.ip;
  return candidate || "unknown";
}

async function rateLimit(key: string) {
  const result = await limiter.consume(key);
  if (!result.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Please wait before trying again." });
}

function safeError(error: unknown): never {
  const message = error instanceof Error ? error.message : "";
  if (message === "SESSION_NOT_FOUND") throw new TRPCError({ code: "NOT_FOUND", message: "This demo session expired or is unavailable." });
  if (message === "MESSAGE_LIMIT") throw new TRPCError({ code: "BAD_REQUEST", message: "This demo reached its message limit. Reset it to continue." });
  if (message === "NO_PATIENT_MESSAGES") throw new TRPCError({ code: "BAD_REQUEST", message: "Add a patient statement first." });
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The request could not be completed safely." });
}

export const medrelayRouter = router({
  status: publicProcedure.query(() => service.status()),
  start: publicProcedure.mutation(async ({ ctx }) => { const key = owner(ctx.req); await rateLimit(`start:${key}`); return service.start(key); }),
  continue: publicProcedure.input(sessionInput.extend({ message: z.string().trim().min(1).max(2_000) }).strict())
    .mutation(async ({ input, ctx }) => { const key = owner(ctx.req); await rateLimit(`generate:${key}`); try { return await service.continue(input.conversationId, input.accessToken, key, input.message); } catch (error) { return safeError(error); } }),
  handoff: publicProcedure.input(sessionInput).mutation(async ({ input, ctx }) => { const key = owner(ctx.req); await rateLimit(`generate:${key}`); try { return await service.handoff(input.conversationId, input.accessToken, key); } catch (error) { return safeError(error); } }),
  reset: publicProcedure.input(sessionInput).mutation(async ({ input, ctx }) => { const key = owner(ctx.req); return service.reset(input.conversationId, input.accessToken, key); }),
});

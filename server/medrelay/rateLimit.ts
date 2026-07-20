export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

export type RateLimiter = {
  readonly kind: "memory" | "upstash-redis";
  consume(key: string): RateLimitResult | Promise<RateLimitResult>;
};

export class FixedWindowRateLimiter implements RateLimiter {
  readonly kind = "memory" as const;
  private readonly entries = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly limit = 20, private readonly windowMs = 60_000, private readonly now: () => number = Date.now) {}
  consume(key: string): RateLimitResult {
    this.cleanup();
    const current = this.now();
    const entry = this.entries.get(key);
    if (!entry || entry.resetAt <= current) {
      this.entries.set(key, { count: 1, resetAt: current + this.windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (entry.count >= this.limit) return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt-current)/1000)) };
    entry.count++;
    return { allowed: true, retryAfterSeconds: 0 };
  }
  cleanup() { const now = this.now(); for (const [key, value] of this.entries) if (value.resetAt <= now) this.entries.delete(key); }
}

export class RedisFixedWindowRateLimiter implements RateLimiter {
  readonly kind = "upstash-redis" as const;

  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly limit = 20,
    private readonly windowSeconds = 60,
  ) {}

  static fromEnv(): RedisFixedWindowRateLimiter | null {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    return url && token ? new RedisFixedWindowRateLimiter(url, token) : null;
  }

  async consume(key: string): Promise<RateLimitResult> {
    const script = [
      "local count = redis.call('INCR', KEYS[1])",
      "if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end",
      "local ttl = redis.call('TTL', KEYS[1])",
      "if count <= tonumber(ARGV[1]) then return {1, ttl} else return {0, ttl} end",
    ].join("\n");
    const startedAt = Date.now();
    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(["EVAL", script, "1", `medrelay:rate:${key}`, this.limit, this.windowSeconds]),
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) {
        console.warn("[medrelay] upstash rate-limit response", { status: response.status, elapsedMs: Date.now() - startedAt });
        throw new Error("RATE_LIMIT_UNAVAILABLE");
      }
      const payload = await response.json() as { result?: [number, number]; error?: string };
      if (payload.error || !payload.result) {
        console.warn("[medrelay] upstash rate-limit error", { status: response.status, elapsedMs: Date.now() - startedAt });
        throw new Error("RATE_LIMIT_UNAVAILABLE");
      }
      return { allowed: payload.result[0] === 1, retryAfterSeconds: Math.max(1, payload.result[1]) };
    } catch (error) {
      if (error instanceof Error && error.message === "RATE_LIMIT_UNAVAILABLE") throw error;
      console.warn("[medrelay] upstash rate-limit request failed", { errorType: error instanceof Error ? error.name : "unknown", elapsedMs: Date.now() - startedAt });
      throw new Error("RATE_LIMIT_UNAVAILABLE");
    }
  }
}

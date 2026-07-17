import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
export type TrpcContext = CreateExpressContextOptions & { user: null };
export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> { return { ...opts, user: null }; }

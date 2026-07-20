import { router } from "./_core/trpc.js";
import { createMedRelayRouter, type MedRelayRouterDependencies } from "./routers/medrelay.js";

export type { MedRelayRouterDependencies } from "./routers/medrelay.js";

export function createAppRouter(dependencies?: MedRelayRouterDependencies) {
  return router({ medrelay: createMedRelayRouter(dependencies) });
}

export const appRouter = createAppRouter();
export type AppRouter = typeof appRouter;

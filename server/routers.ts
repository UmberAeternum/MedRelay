import { router } from "./_core/trpc.js";
import { medrelayRouter } from "./routers/medrelay.js";

export const appRouter = router({ medrelay: medrelayRouter });
export type AppRouter = typeof appRouter;

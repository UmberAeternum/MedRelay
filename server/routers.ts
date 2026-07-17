import { router } from "./_core/trpc";
import { medrelayRouter } from "./routers/medrelay";

export const appRouter = router({ medrelay: medrelayRouter });
export type AppRouter = typeof appRouter;

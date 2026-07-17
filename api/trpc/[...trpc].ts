import { createApiApp } from "../../server/_core/app";

export const maxDuration = 60;

// Vercel preserves the original /api/trpc/<procedure> URL for this catch-all
// function, so the shared Express/tRPC application can handle it directly.
export default createApiApp();

// Keep the explicit .js suffix for Vercel's Node ESM runtime. The function
// compiler emits this TypeScript dependency as JavaScript and Node does not
// resolve extensionless relative imports at runtime.
import { createApiApp } from "../../server/_core/app.js";

export const maxDuration = 60;

// Vercel preserves the original /api/trpc/<procedure> URL for this catch-all
// function, so the shared Express/tRPC application can handle it directly.
export default createApiApp();

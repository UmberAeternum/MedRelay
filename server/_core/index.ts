import { createApiApp } from "./app";

// Local tooling may import the same app, while Vercel invokes api/trpc/[...trpc].ts directly.
export default createApiApp();

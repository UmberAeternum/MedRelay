import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter, createAppRouter, type AppRouter, type MedRelayRouterDependencies } from "../routers.js";
import { createContext } from "./context.js";

type GuardRequest = {
  method: string;
  headers: Record<string, unknown>;
};

type GuardResponse = {
  status(code: number): {
    json(body: unknown): void;
  };
};

type GuardNext = () => void;

export type ApiAppOptions = {
  router?: AppRouter;
  medrelay?: MedRelayRouterDependencies;
};

export function createApiApp(options: ApiAppOptions = {}) {
  const app = express();
  const trpcRouter = options.router ?? (options.medrelay ? createAppRouter(options.medrelay) : appRouter);
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "100kb", extended: false }));
  const sameOriginGuard: express.RequestHandler = (
    req: GuardRequest,
    res: GuardResponse,
    next: GuardNext,
  ) => {
    if (req.method === "GET") return next();
    const origin = req.headers.origin;
    if (typeof origin !== "string" || origin.length === 0) return next();
    try {
      const forwardedHost = req.headers["x-forwarded-host"];
      const requestHost = req.headers.host;
      const host = typeof forwardedHost === "string" ? forwardedHost : requestHost;
      if (new URL(origin).host !== host) {
        res.status(403).json({ error: "Origin rejected" });
        return;
      }
    } catch {
      res.status(403).json({ error: "Origin rejected" });
      return;
    }
    next();
  };
  app.use("/api/trpc", sameOriginGuard);
  app.use("/api/trpc", createExpressMiddleware({ router: trpcRouter, createContext }));
  return app;
}

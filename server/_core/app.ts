import express from "express";
import type { NextFunction, Request, Response } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";

export function createApiApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "100kb", extended: false }));
  app.use("/api/trpc", (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "GET") return next();
    const origin = req.headers.origin;
    if (!origin) return next();
    try {
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      if (new URL(origin).host !== host) return res.status(403).json({ error: "Origin rejected" });
    } catch {
      return res.status(403).json({ error: "Origin rejected" });
    }
    next();
  });
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  return app;
}

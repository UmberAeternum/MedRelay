import http from "node:http";
import { createApiApp } from "./app";
import { serveStatic, setupVite } from "./vite";

const portArgIndex = process.argv.findIndex(argument => argument === "--port");
const port = Number(process.env.PORT) || (portArgIndex >= 0 ? Number(process.argv[portArgIndex + 1]) : 3100) || 3100;
const app = createApiApp();
const server = http.createServer(app);

if (process.env.NODE_ENV === "production") {
  serveStatic(app);
  server.listen(port, "127.0.0.1", () => console.log(`MedRelay production preview listening on http://127.0.0.1:${port}`));
} else {
  await setupVite(app, server);
  server.listen(port, "127.0.0.1", () => console.log(`MedRelay development server listening on http://127.0.0.1:${port}`));
}

const shutdown = () => server.close(() => process.exit(0));
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

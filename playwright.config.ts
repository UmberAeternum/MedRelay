import { defineConfig, devices } from "@playwright/test";
const productionServerCommand = process.platform === "win32"
  ? 'cmd /c "set NODE_ENV=production&& node_modules\\.bin\\tsx.cmd server\\_core\\dev.ts --port 3100"'
  : "NODE_ENV=production node_modules/.bin/tsx server/_core/dev.ts --port 3100";
export default defineConfig({
  testDir: "./e2e", timeout: 30_000, fullyParallel: false,
  use: { baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:3100", trace: "retain-on-failure" },
  // Invoke the installed runner directly so OneDrive-backed pnpm shims do not
  // attempt a second dependency install while Playwright starts the server.
  webServer: { command: productionServerCommand, url: "http://127.0.0.1:3100/medrelay", reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-360", use: { viewport: { width: 360, height: 800 } } },
  ],
});

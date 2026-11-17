import { defineConfig, devices } from "@playwright/test";

const screenshots = process.env.SCREENSHOTS === "1";

export default defineConfig({
  testDir: "e2e",
  testMatch: screenshots ? "**/screenshots.spec.ts" : "**/*.spec.ts",
  testIgnore: screenshots ? [] : ["**/screenshots.spec.ts"],
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3000",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000/api/health",
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      PORT: "3000",
      NEXTAUTH_URL: "http://localhost:3000",
      BILLING_MODE: process.env.BILLING_MODE ?? "mock",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});

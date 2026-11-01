const { defineConfig, devices } = require("@playwright/test");

// BASE_URL apunta al frontend ya levantado (docker compose en CI: http://localhost:3350;
// en local con `npm run dev` en FRONTEND: http://localhost:5173).
const baseURL = process.env.BASE_URL || "http://localhost:3350";

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

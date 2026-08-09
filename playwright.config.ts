import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:2028",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "ASTRO_TELEMETRY_DISABLED=1 npm run preview -- --host 127.0.0.1",
    url: "http://127.0.0.1:2028",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

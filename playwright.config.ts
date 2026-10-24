import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // e2e never calls external APIs: in-memory data, mocked transcription and LLM.
    env: { DATA_SOURCE: "memory", TRANSCRIBE_MOCK: "1", LLM_MOCK: "1" },
  },
});

// Browser E2E for Mockrill. Strategy and coverage matrix: design_documents/e2e-testing/.
//
// Three projects, because "does it work" means three different things here:
//   app     — the dev server, where the UI and the three API routes both run (default).
//   replay  — the same UI fed by the SSE mock publisher (ladder rung 4, FR-11/FR-13).
//   built   — the production bundle from `vite build`, served by `vite preview` (NFR-08).
import { defineConfig, devices } from "@playwright/test";

const DEV_PORT = 5173;
const PREVIEW_PORT = 4173;
const MOCK_PORT = 8787;

export const DEV_URL = `http://localhost:${DEV_PORT}`;
export const PREVIEW_URL = `http://localhost:${PREVIEW_PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  // The interview runs four turns through a real state machine and a real HTTP round trip
  // per turn; 90s leaves room on a cold Vite transform without hiding a hang.
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: ".playwright-report" }]] : [["list"]],
  outputDir: ".playwright-results",
  use: {
    baseURL: DEV_URL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      // FR-01: the live path calls getUserMedia. Chromium's fake device removes the
      // permission prompt so the mic-granted branch is reachable head­lessly; the
      // mic-denied branch is exercised by revoking permissions in the test itself.
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
    },
  },
  projects: [
    {
      name: "app",
      testIgnore: ["**/replay.spec.ts", "**/built.spec.ts"],
      use: { ...devices["Desktop Chrome"], baseURL: DEV_URL },
    },
    {
      name: "replay",
      testMatch: ["**/replay.spec.ts"],
      use: { ...devices["Desktop Chrome"], baseURL: DEV_URL },
    },
    {
      name: "built",
      testMatch: ["**/built.spec.ts"],
      use: { ...devices["Desktop Chrome"], baseURL: PREVIEW_URL },
    },
  ],
  webServer: [
    {
      command: `npx vite --port ${DEV_PORT} --strictPort`,
      url: `${DEV_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      // Deliberately NOT --fast: rung 4 exists so a judge watches the transcript arrive, and
      // a back-to-back replay finishes before the live screen can be observed at all.
      command: `npx vite-node scripts/mockrill-mock-publish.ts`,
      url: `http://localhost:${MOCK_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npx vite build && npx vite preview --port ${PREVIEW_PORT} --strictPort`,
      url: `${PREVIEW_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});

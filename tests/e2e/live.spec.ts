// FR-01/FR-02 — ladder rung 1, the real AssemblyAI path. Skipped unless a key is configured,
// because it mints a real token and opens a real (billed) socket. Run it before the demo:
//   ASSEMBLYAI_API_KEY=... npx playwright test --project=app live.spec
import { expect, test } from "@playwright/test";
import { probe, waitForApp } from "./helpers.js";

const HAS_KEY = Boolean(process.env.ASSEMBLYAI_API_KEY);

test.describe("Live AssemblyAI path", () => {
  test.skip(!HAS_KEY, "set ASSEMBLYAI_API_KEY to exercise the live streaming path");

  test("mints a short-lived token server-side (FR-02)", async ({ request }) => {
    const res = await request.get("/api/aai-token");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { token: string; expires_in_seconds: number };
    expect(body.token.length).toBeGreaterThan(10);
    expect(body.expires_in_seconds).toBeGreaterThan(0);
    expect(body.expires_in_seconds).toBeLessThanOrEqual(600);
  });

  test("opens the streaming socket from the browser with the right parameters", async ({ page }) => {
    const sockets: string[] = [];
    page.on("websocket", (ws) => sockets.push(ws.url()));

    await page.goto("/");
    await waitForApp(page);
    await page.selectOption("#role-select", "junior-frontend");
    await page.getByRole("button", { name: "Start screening call" }).click();

    await expect.poll(() => sockets.length, { timeout: 30_000 }).toBeGreaterThan(0);
    const url = sockets.find((u) => u.includes("streaming.assemblyai.com"))!;
    expect(url).toContain("/v3/ws");
    expect(url).toContain("speech_model=universal-3-5-pro");
    expect(url).toContain("sample_rate=16000");
    expect(url).toContain("encoding=pcm_s16le");
    expect(url).toContain("format_turns=true");
    // R-06: the audio goes browser -> AssemblyAI. A serverless audio proxy would show up
    // here as a socket back to our own origin.
    expect(url).not.toContain("localhost");
    // The temporary token travels in the query string; the raw key never does.
    expect(url).toContain("token=");
  });

  test("reaches a listening state on the real socket (FR-01/FR-03)", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
    await page.selectOption("#role-select", "junior-frontend");
    await page.getByRole("button", { name: "Start screening call" }).click();

    // Chromium's fake device emits silence, so no Turn will finalize — but Begin must arrive
    // and the machine must reach the point where it is listening for the candidate.
    await expect
      .poll(async () => (await probe(page)).envelopes.some((e) => e.step_id === "question-asked"), {
        timeout: 45_000,
      })
      .toBe(true);
    const p = await probe(page);
    expect(["listening", "speaking", "thinking"]).toContain(p.sessionState);
  });
});

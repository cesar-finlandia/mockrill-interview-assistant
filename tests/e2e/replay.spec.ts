// FR-11 + FR-13 rung 4 — the same screens, fed by replayed SSE envelopes instead of the live
// bus: no microphone, no key, no network beyond localhost.
import { expect, test } from "@playwright/test";
import { probe, waitForApp } from "./helpers.js";

test.describe("Mock-envelope replay", () => {
  test("renders the ticking call and the scorecard from the SSE stream alone", async ({ page }) => {
    const socketAttempts: string[] = [];
    page.on("websocket", (ws) => socketAttempts.push(ws.url()));
    const tokenMints: string[] = [];
    page.on("request", (r) => {
      const p = new URL(r.url()).pathname;
      if (p === "/api/aai-token" || p === "/api/turn") tokenMints.push(p);
    });

    await page.goto("/?source=stream");
    await waitForApp(page);

    // Rung 4 lands on the live screen: the point is watching the transcript arrive.
    await expect(page.getByTestId("screen-live")).toBeVisible();
    await expect(page.getByTestId("screen-scorecard")).toBeVisible({ timeout: 60_000 });

    const p = await probe(page);
    expect(p.source).toBe("stream");
    expect(p.envelopes.length).toBeGreaterThan(0);
    expect(p.scorecard).not.toBeNull();
    expect(p.scorecard!.per_question.length).toBeGreaterThan(0);
    await expect(page.getByTestId("scorecard-overall")).toContainText(String(p.scorecard!.overall));

    // Nothing was minted, no socket was opened: this rung must survive a dead venue network.
    expect(tokenMints).toEqual([]);
    expect(socketAttempts.filter((u) => u.includes("assemblyai.com"))).toEqual([]);
  });

  test("replayed envelopes carry the same contract the live bus emits", async ({ page }) => {
    await page.goto("/?source=stream");
    await waitForApp(page);
    await expect(page.getByTestId("screen-scorecard")).toBeVisible({ timeout: 60_000 });

    const p = await probe(page);
    const finals = p.envelopes.filter((e) => e.step_id === "transcript-final");
    expect(finals.length).toBeGreaterThan(0);
    const turn = finals[0]!.payload.turn as { words: Array<{ start: number; end: number }>; formatted: boolean };
    expect(turn.formatted).toBe(true);
    expect(turn.words.length).toBeGreaterThan(0);

    // Sequence-ordered accumulation is what makes the two sources interchangeable.
    const seqs = p.envelopes.map((e) => e.sequence);
    expect([...seqs].sort((a, b) => a - b)).toEqual(seqs);
  });
});

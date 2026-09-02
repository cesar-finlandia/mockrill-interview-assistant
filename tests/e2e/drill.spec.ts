// FR-09 — the differentiator: quote the exact weak moment, then make the candidate say it
// again better, by voice, in the SAME session without reconnecting.
import { expect, test } from "@playwright/test";
import { envelopesOf, probe, runInterviewToScorecard } from "./helpers.js";

test.describe("Re-drill", () => {
  test("re-drills the weakest answer without opening a new session", async ({ page }) => {
    const tokenMints: string[] = [];
    page.on("request", (r) => {
      if (new URL(r.url()).pathname === "/api/aai-token") tokenMints.push(r.url());
    });

    await runInterviewToScorecard(page);
    const before = await probe(page);
    const weakestId = before.scorecard!.weakest_question_id!;
    const beforeScore = before.scorecard!.per_question.find((q) => q.question_id === weakestId)!;
    const mintsBefore = tokenMints.length;

    await page.getByRole("button", { name: "Re-drill this answer" }).click();
    await expect(page.getByTestId("screen-drill")).toBeVisible();

    // The drill screen shows the moment being fixed and what to aim at.
    const quote = beforeScore.evidence[0];
    if (quote) await expect(page.getByTestId("screen-drill")).toContainText(quote.label);
    await expect(page.getByTestId("screen-drill")).toContainText("Target: Focus on");

    await expect
      .poll(async () => envelopesOf(await probe(page), "drill-start").length, { timeout: 30_000 })
      .toBe(1);

    const during = await probe(page);
    const drillStart = envelopesOf(during, "drill-start")[0]!;
    expect(drillStart.payload.question_id).toBe(weakestId);
    expect(drillStart.payload.attempt).toBe(1);

    // Same session throughout: one session-start, one session id, and no second token mint.
    expect(envelopesOf(during, "session-start").length).toBe(1);
    expect(tokenMints.length).toBe(mintsBefore);
  });

  test("scores the retry against the drilled question and shows before/after", async ({ page }) => {
    await runInterviewToScorecard(page);
    const before = await probe(page);
    const weakestId = before.scorecard!.weakest_question_id!;
    const beforeScore = before.scorecard!.per_question.find((q) => q.question_id === weakestId)!;

    await page.getByRole("button", { name: "Re-drill this answer" }).click();
    await expect(page.getByTestId("screen-drill")).toBeVisible();

    // The retry is transcribed live on the drill screen…
    await expect
      .poll(
        async () => {
          const p = await probe(page);
          const i = p.envelopes.findIndex((e) => e.step_id === "drill-start");
          return i >= 0 && p.envelopes.slice(i).some((e) => e.step_id === "transcript-final");
        },
        { timeout: 45_000 },
      )
      .toBe(true);

    // …and re-scored against the question being drilled, not the last one asked.
    await expect(page.locator('[data-testid="screen-drill"] table')).toBeVisible({ timeout: 45_000 });
    const after = await probe(page);
    const i = after.envelopes.findIndex((e) => e.step_id === "drill-start");
    const retryScores = after.envelopes
      .slice(i)
      .filter((e) => e.step_id === "answer-scored")
      .map((e) => e.payload.score as { question_id: string; overall: number });
    expect(retryScores.length).toBeGreaterThan(0);
    expect(retryScores.at(-1)!.question_id).toBe(weakestId);

    // The comparison table names both readings for all four axes.
    const rows = page.locator('[data-testid="screen-drill"] tbody tr');
    await expect(rows).toHaveCount(4);
    await expect(rows.first()).toContainText(String(beforeScore.axes.structure));
  });

  test("returns to the scorecard from the drill", async ({ page }) => {
    await runInterviewToScorecard(page);
    await page.getByRole("button", { name: "Re-drill this answer" }).click();
    await expect(page.getByTestId("screen-drill")).toBeVisible();
    await page.getByRole("button", { name: "Back to Scorecard" }).click();
    await expect(page.getByTestId("screen-scorecard")).toBeVisible();
  });
});

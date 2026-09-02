// FR-07 (evidence quotes with mm:ss), FR-08 (deterministic filler detection),
// FR-09 (weakest-answer selection), FR-10 (scorecard + history states).
import { expect, test } from "@playwright/test";
import { probe, runInterviewToScorecard } from "./helpers.js";

test.describe("Scorecard", () => {
  test("quotes exact spoken moments with mm:ss labels", async ({ page }) => {
    await runInterviewToScorecard(page);
    const p = await probe(page);
    const sc = p.scorecard!;

    const evidence = sc.per_question.flatMap((q) => q.evidence);
    expect(evidence.length).toBeGreaterThan(0);
    for (const q of evidence) {
      expect(q.label).toMatch(/^\d{2}:\d{2}$/);
      expect(q.end_ms).toBeGreaterThanOrEqual(q.start_ms);
      // The label is derived from start_ms, so the two must agree — a label that drifts from
      // its timestamp is the one failure the judge can catch live.
      const mm = String(Math.floor(Math.floor(q.start_ms / 1000) / 60)).padStart(2, "0");
      const ss = String(Math.floor(q.start_ms / 1000) % 60).padStart(2, "0");
      expect(q.label).toBe(`${mm}:${ss}`);
      expect(["filler", "quote", "pause"]).toContain(q.kind);
    }

    // …and they are on screen, not merely in the event log.
    const shown = evidence[0]!;
    await expect(page.getByTestId("screen-scorecard")).toContainText(shown.label);
  });

  test("counts filler words deterministically and names the worst offender", async ({ page }) => {
    await runInterviewToScorecard(page);
    const p = await probe(page);
    const sc = p.scorecard!;

    expect(sc.filler_total).toBeGreaterThan(0);
    await expect(page.getByTestId("scorecard-fillers")).toContainText(String(sc.filler_total));

    const fillerQuotes = sc.per_question.flatMap((q) => q.evidence).filter((q) => q.kind === "filler");
    expect(fillerQuotes.length).toBeGreaterThan(0);
    // The signature line from the pitch: a repeated filler is reported with its count.
    expect(fillerQuotes.some((q) => /\d+\s*[x×]/i.test(q.note))).toBe(true);
  });

  test("re-running the same session produces the same numbers (FR-08 determinism)", async ({ page }) => {
    await runInterviewToScorecard(page);
    const first = (await probe(page)).scorecard!;
    await runInterviewToScorecard(page);
    const second = (await probe(page)).scorecard!;

    expect(second.overall).toBe(first.overall);
    expect(second.filler_total).toBe(first.filler_total);
    expect(second.per_question.map((q) => q.overall)).toEqual(first.per_question.map((q) => q.overall));
    expect(second.weakest_question_id).toBe(first.weakest_question_id);
  });

  test("marks the weakest answer and offers exactly one re-drill entry point", async ({ page }) => {
    await runInterviewToScorecard(page);
    const p = await probe(page);
    const sc = p.scorecard!;

    const lowest = [...sc.per_question].sort(
      (a, b) => a.overall - b.overall || a.turn_order - b.turn_order,
    )[0]!;
    expect(sc.weakest_question_id).toBe(lowest.question_id);
    await expect(page.getByRole("button", { name: "Re-drill this answer" })).toHaveCount(1);
  });

  test("the session is kept in history", async ({ page }) => {
    await runInterviewToScorecard(page);
    const sc = (await probe(page)).scorecard!;
    await page.getByRole("button", { name: "History" }).click();
    await expect(page.getByTestId("screen-history")).toBeVisible();
    await expect(page.getByTestId("screen-history")).toContainText(sc.session_id);
    await expect(page.getByTestId("screen-history")).toContainText(String(sc.overall));
  });
});

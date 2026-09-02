// The core loop: FR-03 (Turn handling), FR-04 (interviewer speaks, mic muted), FR-05/FR-06
// (one tool-calling turn request per candidate turn), FR-10 (live state), NFR-05, NFR-06.
import { expect, test } from "@playwright/test";
import { envelopesOf, probe, runInterviewToScorecard, startCall, stepIds } from "./helpers.js";

test.describe("Screening call", () => {
  test("ticks a live transcript and finalizes formatted turns with word timestamps", async ({ page }) => {
    await startCall(page);

    await expect
      .poll(async () => stepIds(await probe(page)).filter((s) => s === "transcript-partial").length, {
        timeout: 30_000,
      })
      .toBeGreaterThan(0);

    await expect
      .poll(async () => stepIds(await probe(page)).filter((s) => s === "transcript-final").length, {
        timeout: 45_000,
      })
      .toBeGreaterThan(0);

    const p = await probe(page);

    const partial = envelopesOf(p, "transcript-partial")[0]!;
    expect(partial.status).toBe("streaming");
    const partialTurn = partial.payload.turn as { end_of_turn: boolean; formatted: boolean };
    expect(partialTurn.end_of_turn).toBe(false);

    const final = envelopesOf(p, "transcript-final")[0]!;
    expect(final.status).toBe("done");
    const finalTurn = final.payload.turn as {
      end_of_turn: boolean;
      formatted: boolean;
      transcript: string;
      words: Array<{ text: string; start: number; end: number; confidence: number }>;
    };
    // FR-03: only end_of_turn && turn_is_formatted turns finalize, and they carry the
    // word-level timing the whole evidence story depends on.
    expect(finalTurn.end_of_turn).toBe(true);
    expect(finalTurn.formatted).toBe(true);
    expect(finalTurn.words.length).toBeGreaterThan(0);
    const w = finalTurn.words[0]!;
    // start/end are milliseconds from session start, not seconds.
    expect(w.end).toBeGreaterThan(w.start);
    expect(w.start).toBeGreaterThanOrEqual(0);
    expect(w.confidence).toBeGreaterThan(0);
    // The live screen renders that transcript, not just the event log.
    await expect(page.getByTestId("screen-live")).toContainText(finalTurn.transcript.slice(0, 40));
  });

  test("asks a question, scores each answer, and ends with a scorecard", async ({ page }) => {
    await runInterviewToScorecard(page);
    const p = await probe(page);
    const ids = stepIds(p);

    expect(ids[0]).toBe("session-start");
    expect(ids).toContain("mic-capture");
    expect(ids).toContain("question-asked");
    expect(ids).toContain("answer-scored");
    expect(ids).toContain("scorecard-ready");
    expect(ids).toContain("session-end");

    // One score per answered question, and every score is attributed to a question that was
    // actually asked — a mis-attributed score silently overwrites an earlier one.
    const askedIds = envelopesOf(p, "question-asked").map(
      (e) => (e.payload.question as { id: string } | null)?.id,
    );
    const scored = envelopesOf(p, "answer-scored").map((e) => (e.payload.score as { question_id: string }).question_id);
    expect(scored.length).toBeGreaterThan(0);
    for (const id of scored) expect(askedIds).toContain(id);
    expect(new Set(scored).size).toBe(scored.length);

    expect(p.scorecard).not.toBeNull();
    expect(p.scorecard!.per_question.length).toBe(scored.length);
    expect(p.scorecard!.overall).toBeGreaterThan(0);
  });

  test("spends exactly one interviewer request per candidate turn (NFR-05)", async ({ page }) => {
    const turnRequests: string[] = [];
    page.on("request", (r) => {
      if (new URL(r.url()).pathname === "/api/turn") turnRequests.push(r.url());
    });

    await runInterviewToScorecard(page);
    const p = await probe(page);

    // One opening request to choose question 1, then one per finalized answer.
    const finals = envelopesOf(p, "transcript-final").length;
    expect(turnRequests.length).toBe(finals + 1);
  });

  test("starts speaking within 2s of end_of_turn (NFR-06)", async ({ page }) => {
    await runInterviewToScorecard(page);
    const p = await probe(page);
    const latencies = envelopesOf(p, "question-asked")
      .map((e) => e.payload.latency_ms as number | undefined)
      .filter((v): v is number => typeof v === "number")
      // The opening question is reported as 0: there is no preceding turn to measure from.
      .filter((v) => v > 0);

    expect(latencies.length).toBeGreaterThan(0);
    const sorted = [...latencies].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length / 2)]!;
    expect(p50).toBeLessThanOrEqual(2000);
  });

  test("mutes the microphone while the interviewer speaks (FR-04)", async ({ page }) => {
    await startCall(page);
    // mic-capture is emitted muted at the moment the first question is selected, before the
    // interviewer speaks — the candidate is never transcribed over the question.
    await expect
      .poll(async () => envelopesOf(await probe(page), "mic-capture").length, { timeout: 30_000 })
      .toBeGreaterThan(0);
    const p = await probe(page);
    const micStart = envelopesOf(p, "mic-capture").find((e) => e.status === "started")!;
    expect(micStart.payload.sample_rate).toBe(16000);
    expect(micStart.payload.muted).toBe(true);
  });

  test("every UI-visible event is a well-formed EventEnvelope (FR-11)", async ({ page }) => {
    await runInterviewToScorecard(page);
    const p = await probe(page);
    const allowed = new Set([
      "session-start",
      "mic-capture",
      "transcript-partial",
      "transcript-final",
      "question-asked",
      "answer-scored",
      "scorecard-ready",
      "drill-start",
      "session-end",
    ]);
    let previous = -1;
    for (const e of p.envelopes) {
      expect(allowed).toContain(e.step_id);
      expect(["started", "streaming", "done", "error"]).toContain(e.status);
      expect(typeof e.sequence).toBe("number");
      expect(Number.isNaN(Date.parse(e.timestamp))).toBe(false);
      expect(e.sequence).toBeGreaterThan(previous); // rendered in sequence order
      previous = e.sequence;
    }
  });
});

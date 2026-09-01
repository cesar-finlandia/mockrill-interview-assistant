import type { AnswerScore, Scorecard, TranscriptTurn } from "src/mockrill/contracts";
import { detectFillers } from "./fillers.js";

export function buildScorecard(input: { session_id: string; started_at: number; scores: AnswerScore[]; turns: TranscriptTurn[]; degraded: boolean }): Scorecard {
  let firstStart = Infinity;
  let lastEnd = -Infinity;
  for (const turn of input.turns) {
    for (const w of turn.words) {
      if (w.start < firstStart) firstStart = w.start;
      if (w.end > lastEnd) lastEnd = w.end;
    }
  }
  const duration_ms = (!isFinite(firstStart) || !isFinite(lastEnd)) ? 0 : Math.max(0, lastEnd - firstStart);
  const allHits: ReturnType<typeof detectFillers> = [];
  for (const turn of input.turns) {
    allHits.push(...detectFillers(turn));
  }
  const filler_total = allHits.length;
  const counts = new Map<string, typeof allHits>();
  for (const h of allHits) {
    const arr = counts.get(h.word);
    if (arr) arr.push(h);
    else counts.set(h.word, [h]);
  }
  const filler_top = [...counts.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 5).map(([, hits]) => hits[0]!);
  const overall = input.scores.length === 0 ? 0 : Math.round((input.scores.reduce((s, x) => s + x.overall, 0) / input.scores.length) * 10) / 10;
  const weakest_question_id = selectWeakest({ per_question: input.scores } as Scorecard);
  return {
    session_id: input.session_id,
    created_at: new Date().toISOString(),
    duration_ms,
    per_question: input.scores,
    overall,
    filler_total,
    filler_top,
    weakest_question_id,
    degraded: input.degraded,
  };
}

export function selectWeakest(scorecard: Scorecard): string | null {
  if (!scorecard.per_question || scorecard.per_question.length === 0) return null;
  let weakest = scorecard.per_question[0]!;
  for (const cur of scorecard.per_question.slice(1)) {
    if (cur.overall < weakest.overall) weakest = cur;
    else if (cur.overall === weakest.overall && cur.turn_order < weakest.turn_order) weakest = cur;
  }
  return weakest.question_id;
}

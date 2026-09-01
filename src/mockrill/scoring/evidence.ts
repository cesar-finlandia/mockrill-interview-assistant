import { formatTimestamp } from "src/mockrill/contracts";
import type { TranscriptTurn, FillerHit, EvidenceQuote } from "src/mockrill/contracts";

export const MAX_EVIDENCE = 4 as const;
export const PAUSE_MS = 1500 as const;

export function buildEvidence(turn: TranscriptTurn, hits: FillerHit[]): EvidenceQuote[] {
  if (!turn.words || turn.words.length === 0) return [];
  const result: EvidenceQuote[] = [];

  // Priority 1: highest-count filler cluster
  if (hits.length > 0) {
    const counts = new Map<string, FillerHit[]>();
    for (const h of hits) {
      const arr = counts.get(h.word);
      if (arr) arr.push(h);
      else counts.set(h.word, [h]);
    }
    let topEntry: string | null = null;
    let topHits: FillerHit[] = [];
    for (const [word, arr] of counts) {
      if (topEntry === null || arr.length > topHits.length) {
        topEntry = word;
        topHits = arr;
      }
    }
    if (topEntry !== null && topHits.length > 0) {
      const rep = topHits[0]!;
      result.push({
        kind: "filler",
        text: topEntry,
        start_ms: rep.start_ms,
        end_ms: rep.end_ms,
        label: formatTimestamp(rep.start_ms),
        note: `said "${topEntry}" ${topHits.length}x here`,
      });
    }
  }

  // Priority 2: longest silence gap >= PAUSE_MS
  if (turn.words.length >= 2) {
    let bestGap: { idx: number; gap: number } | null = null;
    for (let i = 0; i < turn.words.length - 1; i++) {
      const gap = turn.words[i + 1]!.start - turn.words[i]!.end;
      if (gap >= PAUSE_MS && (bestGap === null || gap > bestGap.gap)) {
        bestGap = { idx: i, gap };
      }
    }
    if (bestGap !== null && result.length < MAX_EVIDENCE) {
      const idx = bestGap.idx;
      const gap = bestGap.gap;
      const before = turn.words.slice(Math.max(0, idx - 4), idx + 1).map((w) => w.text).join(" ");
      const after = turn.words.slice(idx + 1, Math.min(turn.words.length, idx + 6)).map((w) => w.text).join(" ");
      const t = (before + " " + after).trim();
      const start_ms = turn.words[idx]!.end;
      const end_ms = turn.words[idx + 1]!.start;
      result.push({
        kind: "pause",
        text: t,
        start_ms,
        end_ms,
        label: formatTimestamp(start_ms),
        note: `paused ${Math.round(gap / 100) / 10}s here`,
      });
    }
  }

  // Priority 3: first sentence of the answer as a quote
  if (turn.transcript && turn.transcript.trim().length > 0 && result.length < MAX_EVIDENCE) {
    const m = turn.transcript.match(/^[^.!?]+[.!?]/);
    const sentence = (m ? m[0] : turn.transcript.slice(0, 120)).trim();
    const w0 = turn.words[0]!;
    const wN = turn.words[turn.words.length - 1]!;
    result.push({
      kind: "quote",
      text: sentence,
      start_ms: w0.start,
      end_ms: wN.end,
      label: formatTimestamp(w0.start),
      note: `said: "${sentence}"`,
    });
  }

  // Priority 4: lowest confidence word span as a quote
  if (turn.words.length > 0 && result.length < MAX_EVIDENCE) {
    let minW = turn.words[0]!;
    for (const w of turn.words) {
      if (w.confidence < minW.confidence) minW = w;
    }
    result.push({
      kind: "quote",
      text: minW.text,
      start_ms: minW.start,
      end_ms: minW.end,
      label: formatTimestamp(minW.start),
      note: `low confidence "${minW.text}" here`,
    });
  }

  return result.slice(0, MAX_EVIDENCE);
}

import type { TranscriptTurn, FillerHit } from "src/mockrill/contracts";

export const FILLER_LEXICON = ["um","uh","er","ah","like","kind of","sort of","you know","i mean","basically","actually","literally","right?","so yeah","i guess","whatever","stuff","things like that"] as const;
export type FillerLexiconEntry = typeof FILLER_LEXICON[number];

// multi-word entries: "kind of","sort of","you know","i mean","so yeah","i guess","things like that" (7)

const REJECT_SET = new Set(["is","are","was","were","feel","felt","look","looks","sound","sounds","seem","seems"]);
const FOLLOW_SET = new Set(["this","that","it"]);

function normalizeToken(text: string): string {
  let n = text.toLowerCase();
  const strip = new Set([".", ",", "!", "?", ";", ":", '"', "'"]);
  while (n.length > 0 && strip.has(n[0]!)) n = n.slice(1);
  while (n.length > 0 && strip.has(n[n.length - 1]!)) n = n.slice(0, -1);
  return n;
}

function lexiconTokens(entry: string): string[] {
  return entry.toLowerCase().split(" ").map(normalizeToken);
}

export function detectFillers(turn: TranscriptTurn): FillerHit[] {
  if (!turn.words || turn.words.length === 0) return [];
  const N = turn.words.length;
  const norm: string[] = turn.words.map((w) => normalizeToken(w.text));
  type LexEntry = { entry: string; tokens: string[] };
  const entries: LexEntry[] = [...FILLER_LEXICON].map((e) => ({ entry: e, tokens: lexiconTokens(e) }));
  const L = entries.sort((a, b) => {
    if (b.tokens.length !== a.tokens.length) return b.tokens.length - a.tokens.length;
    return b.entry.length - a.entry.length;
  });
  const result: FillerHit[] = [];
  let i = 0;
  while (i < N) {
    let matched = false;
    for (const { entry, tokens } of L) {
      const k = tokens.length;
      if (i + k > N) continue;
      let eq = true;
      for (let j = 0; j < k; j++) {
        if (norm[i + j]! !== tokens[j]!) { eq = false; break; }
      }
      if (!eq) continue;
      if (entry === "like") {
        const prev = i > 0 ? norm[i - 1]! : null;
        const next = i + k < N ? norm[i + k]! : null;
        const prevIsReject = prev !== null && REJECT_SET.has(prev);
        const nextIsFollow = next !== null && FOLLOW_SET.has(next);
        const nextIsFiller = next !== null && (next === "uh" || next === "um" || next === "er" || next === "ah");
        if (nextIsFollow) continue;
        if (prevIsReject && !nextIsFiller) continue;
      }
      const start_ms = turn.words[i]!.start;
      const end_ms = turn.words[i + k - 1]!.end;
      result.push({ word: entry, start_ms, end_ms });
      i += k;
      matched = true;
      break;
    }
    if (!matched) i += 1;
  }
  return result;
}

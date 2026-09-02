import type { EvidenceQuote } from "src/mockrill/contracts/index.js";
import type { Citation } from "src/platform/ui/index.js";

// Q-UI-01: Citation shape diverges from EvidenceQuote; adapter preserves label mm:ss
// If Citation matched EvidenceQuote exactly we could do `return q as unknown as Citation` (identity cast).
// Real Citation is {title, url, snippet} so we map fields preserving mm:ss label.
export function toCitation(q: EvidenceQuote): Citation {
  // Preserve label mm:ss prominently; CitationDisplay renders title + snippet, while ScorecardView also renders explicit <span>{q.label}</span>
  return {
    title: q.text,
    snippet: `${q.label} — ${q.note}`,
    url: undefined,
  } as Citation;
}

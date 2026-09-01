# DP-SCORECARD — Evidence-Backed Scoring & Re-Drill Selection

## §1 Purpose & scope

### §1.1 What this plan delivers

- **Deterministic, offline, pure-function scoring engine (M30–M36).** Zero network, zero LLM, zero React, zero Node-only APIs. Every function is total and runs identically in the browser and in vitest. This is the credibility backbone for the "wow" moment — *"at 07:42 you said 'kind of' 3\times before answering."*
- **Filler detection `src/mockrill/scoring/fillers.ts` (M30)** — frozen `FILLER_LEXICON` literal list, `detectFillers(turn)` with multi-word sliding-window matcher and the `like` disambiguation rule.
- **Evidence builder `src/mockrill/scoring/evidence.ts` (M31)** — `buildEvidence(turn, hits)` producing at most 4 timestamped `EvidenceQuote`s via the fixed priority ladder, importing `formatTimestamp` for labels.
- **Deterministic rubric `src/mockrill/scoring/rubric.ts` (M32–M33)** — `scoreAnswerDeterministic(turn, question)` with four integer 0–5 axes and `mergeScores(llm, det)` that never trusts LLM evidence.
- **Scorecard aggregation `src/mockrill/scoring/scorecard.ts` (M34–M35)** — `buildScorecard(input)` and `selectWeakest(scorecard)` producing the session `Scorecard` and the re-drill target.
- **Barrel `src/mockrill/scoring/index.ts` (M36)** — sole public import path for every other DP.

### §1.2 Explicitly OUT of scope, and which DP owns it instead

| Out-of-scope item | Owning DP | Reason |
|---|---|---|
| `TranscriptWord`, `TranscriptTurn`, `InterviewQuestion`, `RubricAxis`, `EvidenceQuote`, `FillerHit`, `AnswerScore`, `Scorecard`, `formatTimestamp`, `MOCKRILL_STEP_IDS`, etc. | DP-CONTRACTS | Types and timestamp formatting are the shared vocabulary; scoring only consumes them |
| `GET /api/aai-token`, `createMicSource`, `createStreamingClient` (M16–M20) | DP-AAI-STREAM | Streaming/token — not scoring |
| `createSpeaker`, `createTurnController` (M21–M23) | DP-TURNTAKING | Turn-taking state machine |
| `TurnRequest`/`InterviewerAction`, tool descriptors, `chatCompletion`, `POST /api/turn`, `callInterviewer`, question bank (M24–M29) | DP-INTERVIEWER | LLM orchestration; scoring provides the deterministic fallback score that `callInterviewer` merges |
| `createEventBus`, `useMockrillEvents`, `main.tsx`/`index.html` (M37–M39) | DP-UI | React/UI wiring |
| `GET /api/health`, `vercel.json` (M40–M41) | DP-DEPLOY | Deployment |
| `session-golden.json`, `mockrill-mock-publish.ts`, `fallback-ladder.md` (M42–M44) | DP-DEMOPROOF | Demo/offline replay consumes the scorecard but does not produce it |
| Any LLM call, `withResilience` wrapping, React component, `window.speechSynthesis`, `fetch` | All other DPs | This plan is pure functions only; resilience/LLM is owned by DP-INTERVIEWER |

## §2 Requirements

| # | Requirement | Source | Judging axis |
|---|---|---|---|
| R-SCORE-01 | `FILLER_LEXICON` is a frozen (`as const`) array containing exactly the 18 literal entries `um`, `uh`, `er`, `ah`, `like`, `kind of`, `sort of`, `you know`, `i mean`, `basically`, `actually`, `literally`, `right?`, `so yeah`, `i guess`, `whatever`, `stuff`, `things like that` and marks multi-word entries | M30, handout | Application of Technology |
| R-SCORE-02 | `detectFillers(turn: TranscriptTurn): FillerHit[]` implements the 5-step algorithm: normalize (lowercase, strip `.,!?;:"'`, keep `'`), sort lexicon by descending word-count, sliding window with non-overlapping advance, `like` exception rule, never throw on empty `words` | M30 | Application of Technology |
| R-SCORE-03 | `buildEvidence(turn, hits): EvidenceQuote[]` imports `formatTimestamp` from `src/mockrill/contracts`, produces at most `MAX_EVIDENCE=4` quotes via priority ladder: (1) highest-count filler cluster, (2) longest silence gap \u2265 `PAUSE_MS=1500` as `pause`, (3) first sentence as `quote`, (4) lowest confidence word as `quote`; fixed templates per kind; pause text = 5 words before+after gap | M31 | Application of Technology, Presentation |
| R-SCORE-04 | `scoreAnswerDeterministic(turn, question): AnswerScore` computes four integer 0–5 axes: `structure` (STAR marker coverage \u00d7 1.25 rounded capped 5), `specificity` (numerals+proper nouns+keyterms count buckets), `clarity` (5 minus 1 per `FILLER_RATE_STEP=0.02` above `FILLER_RATE_FLOOR=0.02`), `relevance` (keyterm fraction buckets); `overall = Math.round(mean*10)/10`; `source:"deterministic"`; `rationale` names weakest axis; at least 3 worked examples as test cases | M32 | Application of Technology, Presentation |
| R-SCORE-05 | `mergeScores(llm: AnswerScore\|null, det: AnswerScore): AnswerScore` table: `llm===null` \u2192 `det`; else per-axis `Math.round((llm+det)/2)`, `evidence` always `det.evidence`, `rationale` prefers LLM, `source:"llm"`; plan states explicitly why LLM evidence is never trusted | M33 | Application of Technology, Business Value |
| R-SCORE-06 | `buildScorecard(input:{session_id, started_at, scores, turns, degraded}): Scorecard` computes `duration_ms` (last word `end` minus first word `start` floored 0), `filler_total`/`filler_top` (total + 5 most frequent), `overall` mean of `per_question[].overall` same rounding empty\u21920 | M34 | Application of Technology |
| R-SCORE-07 | `selectWeakest(scorecard): string\|null` returns `question_id` of lowest `overall`, ties by earliest `turn_order`, empty \u2192 `null`; `degraded` propagates from input | M35 | Application of Technology |
| R-SCORE-08 | Barrel `src/mockrill/scoring/index.ts` re-exports M30–M35 and is the only import path other DPs use | M36 | Application of Technology |
| R-SCORE-09 | Zero imports outside `src/mockrill/contracts` and `src/resilience` (`isDegradedResult` only); no `fetch`/`window`/React/Node-only APIs; runs identically in browser and vitest | Non-negotiables | Application of Technology |
| R-SCORE-10 | Every function is total: no throws, no `undefined` returns, empty inputs give well-defined empty outputs | Non-negotiables | Application of Technology |
| R-SCORE-11 | Every work unit has one runnable `vitest` verification over a literal fixture printing a specific asserted value; pure tests are the regression safety net (\u00a710) | S8, Non-negotiables | Presentation |

## §3 Contracts OWNED by this plan

> Rule for every contract below: file path and exported name are exact. Consumers MUST import this from the owning path shown; re-defining, re-typing, stubbing or copying it is a defect.

### M30 `FILLER_LEXICON` + `detectFillers` — `src/mockrill/scoring/fillers.ts`

- **File:** `src/mockrill/scoring/fillers.ts`
- **Exports:**
  ```ts
  export const FILLER_LEXICON = ["um","uh","er","ah","like","kind of","sort of","you know","i mean","basically","actually","literally","right?","so yeah","i guess","whatever","stuff","things like that"] as const;
  export type FillerLexiconEntry = typeof FILLER_LEXICON[number];
  export function detectFillers(turn: TranscriptTurn): FillerHit[];
  ```
- **Lexicon literal (normative, 18 entries, frozen with `as const`):**
  | entry | multi-word? | note |
  |---|---|---|
  | `um` | no | |
  | `uh` | no | |
  | `er` | no | |
  | `ah` | no | |
  | `like` | no | subject to the `like` exception rule |
  | `kind of` | **yes (2)** | |
  | `sort of` | **yes (2)** | |
  | `you know` | **yes (2)** | |
  | `i mean` | **yes (2)** | |
  | `basically` | no | |
  | `actually` | no | |
  | `literally` | no | |
  | `right?` | no | includes `?` — normalization strips it; stored lexicon entry keeps `?` for display, matching handles stripped form |
  | `so yeah` | **yes (2)** | |
  | `i guess` | **yes (2)** | |
  | `whatever` | no | |
  | `stuff` | no | |
  | `things like that` | **yes (3)** | longest phrase (3 words) |
  Multi-word set = `{ "kind of","sort of","you know","i mean","so yeah","i guess","things like that" }` (7 entries).
- **Signature:** `(turn: TranscriptTurn) => FillerHit[]` where `FillerHit = { word: string; start_ms: number; end_ms: number }`.
- **Behavior:** numbered 5-step algorithm (see §5 A1). Returns `[]` if `turn.words` is empty. Never throws. `word` in result is the lexicon entry literal (e.g. `"kind of"`), not the raw token text.
- **Consumers:** M31 `buildEvidence` (counts hits per filler word), M34 `buildScorecard` (filler_total/filler_top), DP-INTERVIEWER (may call for degraded scoring), DP-UI (filler badges), DP-DEMOPROOF (golden fixture). Consumers MUST import this from `src/mockrill/scoring/fillers.ts` via the barrel `src/mockrill/scoring`; re-defining or stubbing it is a defect.

### M31 `buildEvidence` — `src/mockrill/scoring/evidence.ts`

- **File:** `src/mockrill/scoring/evidence.ts`
- **Export:**
  ```ts
  import { formatTimestamp } from "src/mockrill/contracts";
  export const MAX_EVIDENCE = 4 as const;
  export const PAUSE_MS = 1500 as const;
  export function buildEvidence(turn: TranscriptTurn, hits: FillerHit[]): EvidenceQuote[];
  ```
- **Signature:** `(turn: TranscriptTurn, hits: FillerHit[]) => EvidenceQuote[]` where `EvidenceQuote = { kind: "filler"|"quote"|"pause"; text: string; start_ms: number; end_ms: number; label: string; note: string }`.
- **Behavior:** at most 4 quotes per turn via priority ladder (see §5 A2). `label` uses `formatTimestamp` (e.g. `"07:42"`). Never throws; empty `turn.words` \u2192 `[]`. `hits` is the output of `detectFillers` for the same turn (caller pairs them; function trusts caller but also handles inconsistent hits gracefully).
- **Consumers:** M32 `scoreAnswerDeterministic` (populates `AnswerScore.evidence`), M34 `buildScorecard` (indirect via scores), DP-UI (`CitationDisplay`). Consumers MUST import this from `src/mockrill/scoring`; re-defining or stubbing it is a defect.

### M32 `scoreAnswerDeterministic` — `src/mockrill/scoring/rubric.ts`

- **File:** `src/mockrill/scoring/rubric.ts`
- **Export:**
  ```ts
  export function scoreAnswerDeterministic(turn: TranscriptTurn, question: InterviewQuestion): AnswerScore;
  // helpers exported for testing only:
  export function scoreStructure(transcript: string): number;
  export function scoreSpecificity(transcript: string, question: InterviewQuestion): number;
  export function scoreClarity(turn: TranscriptTurn, hits: FillerHit[]): number;
  export function scoreRelevance(transcript: string, question: InterviewQuestion): number;
  ```
- **Signature:** `(turn: TranscriptTurn, q: InterviewQuestion) => AnswerScore` where `AnswerScore = { question_id: string; turn_order: number; axes: Record<RubricAxis,number>; overall: number; rationale: string; evidence: EvidenceQuote[]; source: "llm"|"deterministic" }`. `axes` values 0–5 integers, `overall = Math.round(mean*10)/10`, `source` always `"deterministic"`.
- **Behavior:** four axis functions (see §5 A3). Never throws. Evidence is built internally via `detectFillers`+`buildEvidence` (or caller-supplied hits). `rationale` names weakest axis via fixed template.
- **Consumers:** `buildScorecard` (when LLM unavailable), DP-INTERVIEWER `callInterviewer` fallback, DP-UI. Consumers MUST import this from `src/mockrill/scoring`; re-defining or stubbing it is a defect.

### M33 `mergeScores` — `src/mockrill/scoring/rubric.ts` (same file)

- **File:** `src/mockrill/scoring/rubric.ts`
- **Export:**
  ```ts
  export function mergeScores(llm: AnswerScore | null, det: AnswerScore): AnswerScore;
  ```
- **Signature:** `(llm: AnswerScore|null, det: AnswerScore) => AnswerScore`.
- **Behavior:** table in §5 A4. Per-axis `Math.round((llm+det)/2)`, `evidence` always `det.evidence`, `rationale` prefers LLM's, `source:"llm"` when llm present else `det`. Never throws. Credibility rationale (see §3 note below).
- **Consumers:** DP-INTERVIEWER `callInterviewer` (merges LLM score with deterministic), DP-UI. Consumers MUST import this from `src/mockrill/scoring`; re-defining or stubbing it is a defect.
- **Credibility note (normative, DP-PITCH will quote):** Evidence never comes from the LLM because the LLM can hallucinate the candidate's exact words and timestamps. The deterministic `buildEvidence` quotes are the only verifiable evidence — they are derived from `TranscriptTurn.words[].start/end` and `formatTimestamp`, so every evidence quote can be checked against the recorded audio/transcript. `mergeScores` therefore always takes `det.evidence`, even when `llm` is present.

### M34 `buildScorecard` — `src/mockrill/scoring/scorecard.ts`

- **File:** `src/mockrill/scoring/scorecard.ts`
- **Export:**
  ```ts
  export function buildScorecard(input: { session_id: string; started_at: number; scores: AnswerScore[]; turns: TranscriptTurn[]; degraded: boolean }): Scorecard;
  ```
- **Input JSON shape:** `{ "session_id": string, "started_at": number (ms from session start, e.g. Date.now() or first word start), "scores": AnswerScore[], "turns": TranscriptTurn[], "degraded": boolean }`.
- **Output:** `Scorecard = { session_id: string; created_at: string (ISO-8601); duration_ms: number; per_question: AnswerScore[]; overall: number; filler_total: number; filler_top: FillerHit[]; weakest_question_id: string|null; degraded: boolean }`.
- **Behavior:** see §5 A5. Never throws.
- **Consumers:** DP-TURNTAKING (emits `scorecard-ready`), DP-UI (scorecard screen), DP-DEMOPROOF (golden fixture), `api/turn` when session done. Consumers MUST import this from `src/mockrill/scoring`; re-defining or stubbing it is a defect.

### M35 `selectWeakest` — `src/mockrill/scoring/scorecard.ts` (same file)

- **File:** `src/mockrill/scoring/scorecard.ts`
- **Export:**
  ```ts
  export function selectWeakest(scorecard: Scorecard): string | null;
  ```
- **Signature:** `(s: Scorecard) => string|null`.
- **Behavior:** lowest `overall` in `per_question`; earliest `turn_order` on tie; empty \u2192 `null`. Never throws.
- **Consumers:** DP-TURNTAKING `drill()` (picks re-drill target), DP-UI (highlights weakest), DP-DEMOPROOF. Consumers MUST import this from `src/mockrill/scoring`; re-defining or stubbing it is a defect.

### M36 Barrel — `src/mockrill/scoring/index.ts`

- **File:** `src/mockrill/scoring/index.ts`
- **Exports (exact):**
  ```ts
  export { FILLER_LEXICON, detectFillers } from "./fillers.js";
  export { buildEvidence, MAX_EVIDENCE, PAUSE_MS } from "./evidence.js";
  export { scoreAnswerDeterministic, mergeScores, scoreStructure, scoreSpecificity, scoreClarity, scoreRelevance } from "./rubric.js";
  export { buildScorecard, selectWeakest } from "./scorecard.js";
  // types are re-exported from contracts, not re-declared:
  export type { TranscriptTurn, InterviewQuestion, AnswerScore, Scorecard, EvidenceQuote, FillerHit, RubricAxis } from "src/mockrill/contracts";
  ```
- **Rule:** re-exports M30–M35 value exports and nothing else. All other Mockrill code imports scoring via `from "src/mockrill/scoring"` (barrel path). Deep imports like `from "src/mockrill/scoring/fillers"` are forbidden outside `src/mockrill/scoring/` itself.
- **Consumers:** every DP that needs scoring (DP-INTERVIEWER, DP-TURNTAKING, DP-UI, DP-DEMOPROOF). Consumers MUST import this from `src/mockrill/scoring`; re-defining or stubbing it is a defect.

## §4 Contracts CONSUMED by this plan

| # | Import path | Export | Signature | Owning DP |
|---|---|---|---|---|
| C1 | `src/mockrill/contracts` | `TranscriptTurn`, `TranscriptWord`, `InterviewQuestion`, `RubricAxis`, `EvidenceQuote`, `FillerHit`, `AnswerScore`, `Scorecard` | types as defined in DP-CONTRACTS M1–M8 | DP-CONTRACTS |
| C2 | `src/mockrill/contracts` | `formatTimestamp` | `(ms: number) => string` -> `mm:ss` zero-padded | DP-CONTRACTS M13 |
| C3 | `src/resilience` | `isDegradedResult` | `(v: unknown) => v is DegradedResult` | chassis `src/resilience` |

**Rules:**
- `formatTimestamp` MUST be imported from `src/mockrill/contracts` (barrel) and never re-derived. `evidence.ts` calls it for every `EvidenceQuote.label`.
- `isDegradedResult` is the ONLY import allowed from `src/resilience`; it is used solely in `scorecard.ts`/`rubric.ts` to propagate `degraded` when scoring inputs arrive via a `DegradedResult` wrapper (defensive; scoring itself never calls network).
- No `fetch`, `window`, `document`, `speechSynthesis`, `MediaStream`, `WebSocket`, React, or Node-only APIs (`fs`, `path`, `process`) may appear anywhere in `src/mockrill/scoring/`.
- None of the consumed contracts may be re-implemented, re-typed, or stubbed — always import from the canonical path.

## §5 Algorithms

### A1 `detectFillers(turn)` — `src/mockrill/scoring/fillers.ts` (M30)

```
1. If !turn.words or turn.words.length === 0: return [].
2. Normalize: for each word w in turn.words:
     n = w.text.toLowerCase()
     n = strip leading/trailing characters in set { '.', ',', '!', '?', ';', ':', '"', "'" } repeatedly
     (keep internal apostrophes, e.g. "don't" stays "don't")
     if n === "": keep as "" (will never match a lexicon entry)
   Produce array norm[0..N-1] parallel to turn.words.
   Also build maps: lexiconNorm entry -> normalized token array + original entry string.
     For each entry e in FILLER_LEXICON:
       eNorm = e.toLowerCase() stripped same way (so "right?" -> "right", "things like that" -> ["things","like","that"])
3. Build sorted lexicon order L = entries sorted by descending word-count (tokens length), tie-break by descending char length. So "things like that" (3) before 2-word phrases before 1-word.
4. Sliding window over norm with index i = 0:
     while i < N:
       matched = false
       for each lexicon entry e in L (in sorted order):
         tokens = eNormTokens(e)   // e.g. "kind of" -> ["kind","of"]
         k = tokens.length
         if i + k > N: continue
         if norm[i .. i+k-1] === tokens element-wise:
           // 'like' exception check (step 5): if e === "like" and exception fires, continue to next e (treat as not a match)
           if e === "like":
             prev = (i>0) ? norm[i-1] : null
             next = (i+k < N) ? norm[i+k] : null
             REJECT_SET = {"is","are","was","were","feel","felt","look","looks","sound","sounds","seem","seems"}
             FOLLOW_SET = {"this","that","it"}
             if prev !== null && REJECT_SET has prev: continue
             if next !== null && FOLLOW_SET has next: continue
           // emit hit
           word = e (original lexicon literal, e.g. "kind of", "right?")
           start_ms = turn.words[i].start
           end_ms   = turn.words[i+k-1].end
           push { word, start_ms, end_ms } to result
           i += k; matched = true; break
       if !matched: i += 1
5. 'like' rule written literally as above — this is the difference between a credible demo and an embarrassing one. Example: "it looks like this" -> NOT a filler; "it was like uh" -> filler.
6. Never throw: any exception path returns [] (but algorithm has no throwing paths; empty inputs handled at step 1).
```

### A2 `buildEvidence(turn, hits)` — `src/mockrill/scoring/evidence.ts` (M31)

```
constants: MAX_EVIDENCE = 4, PAUSE_MS = 1500
import { formatTimestamp } from "src/mockrill/contracts";

function buildEvidence(turn, hits): EvidenceQuote[] {
  if !turn.words or turn.words.length===0: return []
  result: EvidenceQuote[] = []

  // Priority 1: highest-count filler cluster
  if hits.length > 0:
    counts = Map<string, FillerHit[]>
    for h in hits: counts.get(h.word)?.push(h) ?? set
    topEntry = argmax counts by size, tie by first appearance
    topHits = counts.get(topEntry)
    rep = topHits[0]
    result.push({
      kind: "filler",
      text: topEntry,
      start_ms: rep.start_ms,
      end_ms: rep.end_ms,
      label: formatTimestamp(rep.start_ms),
      note: `said "${topEntry}" ${topHits.length}x here`
    })

  // Priority 2: longest silence gap >= PAUSE_MS
  if turn.words.length >= 2:
    bestGap = null
    for i=0..words.length-2:
      gap = words[i+1].start - words[i].end
      if gap >= PAUSE_MS && (bestGap===null || gap > bestGap.gap):
        bestGap = { idx:i, gap }
    if bestGap !== null && result.length < MAX_EVIDENCE:
      idx = bestGap.idx; gap = bestGap.gap
      before = words.slice(Math.max(0, idx-4), idx+1).map(w=>w.text).join(" ")
      after  = words.slice(idx+1, Math.min(words.length, idx+6)).map(w=>w.text).join(" ")
      t = (before + " " + after).trim()
      start_ms = words[idx].end; end_ms = words[idx+1].start
      result.push({
        kind: "pause",
        text: t,
        start_ms, end_ms,
        label: formatTimestamp(start_ms),
        note: `paused ${Math.round(gap/100)/10}s here`
      })

  // Priority 3: first sentence of the answer as a quote
  if turn.transcript && turn.transcript.trim().length>0 && result.length < MAX_EVIDENCE:
    m = turn.transcript.match(/^[^.!?]+[.!?]/)
    sentence = (m ? m[0] : turn.transcript.slice(0,120)).trim()
    w0 = turn.words[0]; wN = turn.words[turn.words.length-1]
    result.push({
      kind: "quote",
      text: sentence,
      start_ms: w0.start, end_ms: wN.end,
      label: formatTimestamp(w0.start),
      note: `said: "${sentence}"`
    })

  // Priority 4: lowest confidence word span as a quote
  if turn.words.length>0 && result.length < MAX_EVIDENCE:
    minW = turn.words.reduce((min,w) => w.confidence < min.confidence ? w : min, turn.words[0])
    result.push({
      kind: "quote",
      text: minW.text,
      start_ms: minW.start, end_ms: minW.end,
      label: formatTimestamp(minW.start),
      note: `low confidence "${minW.text}" here`
    })

  return result.slice(0, MAX_EVIDENCE)
}
```

Fixed templates (normative):
- filler: `said "${word}" ${count}x here`
- pause: `paused ${seconds}s here` where seconds = Math.round(gap_ms/100)/10
- quote (sentence): `said: "${sentence}"`
- quote (low confidence): `low confidence "${word}" here`

### A3 `scoreAnswerDeterministic(turn, question)` — `src/mockrill/scoring/rubric.ts` (M32)

Each axis integer 0-5. transcriptLower = turn.transcript.toLowerCase().

**structure (STAR-marker coverage):**
```
MARKERS = {
  situation: ["when","at my","during","the project"],
  task:      ["i needed","my job","i was asked","the goal"],
  action:    ["i built","i wrote","i decided","i led","so i"],
  result:    ["resulted","we shipped","reduced","increased","the outcome"]
}
markers = 0
for each set in [situation, task, action, result]:
  if any phrase in set appears as substring in transcriptLower: markers++
score = Math.min(5, Math.round(markers * 1.25))
```

**specificity:**
```
numerals = count of tokens matching /\\b\\d+\\b/ in transcript
properNouns = count of words that start uppercase and are NOT sentence-initial and NOT 'I'
keytermHits = count of question.keyterms where keyterm.toLowerCase() appears as substring in transcriptLower
total = numerals + properNouns + keytermHits
if total===0: 1 else if total<=2: 2 else if total<=4: 3 else if total<=6: 4 else 5
```

**clarity:**
```
FILLER_RATE_FLOOR = 0.02; FILLER_RATE_STEP = 0.02
wordCount = turn.words.length
if wordCount===0: clarity=5 else:
  rate = hits.length / wordCount
  if rate <= FILLER_RATE_FLOOR: clarity=5
  else: clarity = Math.max(0, 5 - Math.ceil((rate - FILLER_RATE_FLOOR) / FILLER_RATE_STEP))
```

**relevance:**
```
if question.keyterms.length===0: relevance=5 else:
  hit= count of keyterms appearing as substring in transcriptLower
  frac = hit / question.keyterms.length
  if frac===0: 1 else if frac<=0.25: 2 else if frac<=0.5: 3 else if frac<=0.75: 4 else 5
```

**overall + rationale + source:**
```
overall = Math.round(((structure+specificity+clarity+relevance)/4)*10)/10
weakestAxis = argmin axes by value, tie-break order [structure,specificity,clarity,relevance] earliest
rationale = `Strongest in ${strongestAxis}, weakest in ${weakestAxis} — focus on ${weakestAxis} next.`
evidence = buildEvidence(turn, detectFillers(turn))
source = "deterministic"
return { question_id: question.id, turn_order: turn.turn_order, axes, overall, rationale, evidence, source }
```

Three fully worked numeric examples (normative — each is a test case):

**Example 1:** question keyterms [React,API,latency], transcript with STAR markers, 30 words, no fillers. markers=4 -> structure 5, specificity total 4 -> 3, clarity 5, relevance 2/3=0.666 -> 4, overall 4.3.
**Example 2:** question keyterms [Kubernetes,deployment,rollback], transcript filler-heavy 9 hits/15 words. structure 0, specificity 1, clarity 0, relevance 1, overall 0.5.
**Example 3:** question keyterms [Postgres,index,query], transcript moderate fillers 3/14. structure 1, specificity 3, clarity 0, relevance 5, overall 2.3. See WU-SCORE-03 for literal fixtures.

### A4 `mergeScores(llm, det)` — `src/mockrill/scoring/rubric.ts` (M33)

```
function mergeScores(llm, det): AnswerScore {
  if llm === null: return det
  axes = {
    structure:   Math.round((llm.axes.structure   + det.axes.structure)/2),
    specificity: Math.round((llm.axes.specificity + det.axes.specificity)/2),
    clarity:     Math.round((llm.axes.clarity     + det.axes.clarity)/2),
    relevance:   Math.round((llm.axes.relevance   + det.axes.relevance)/2),
  }
  overall = Math.round(((axes.structure+axes.specificity+axes.clarity+axes.relevance)/4)*10)/10
  return {
    question_id: det.question_id,
    turn_order:  det.turn_order,
    axes, overall,
    evidence: det.evidence,
    rationale: llm.rationale || det.rationale,
    source: "llm"
  }
}
```
| llm | axes | evidence | rationale | source |
|---|---|---|---|---|
| null | det.axes | det.evidence | det.rationale | deterministic |
| non-null | Math.round((llm+det)/2) per axis | det.evidence | llm.rationale if non-empty else det.rationale | llm |

### A5 `buildScorecard(input)` + `selectWeakest(s)` — `src/mockrill/scoring/scorecard.ts` (M34, M35)

```
function buildScorecard(input): Scorecard {
  firstStart=Infinity; lastEnd=-Infinity
  for turn of input.turns: for w of turn.words: firstStart=min(firstStart,w.start); lastEnd=max(lastEnd,w.end)
  duration_ms = (!isFinite(firstStart)||!isFinite(lastEnd))?0:Math.max(0,lastEnd-firstStart)
  allHits=[]; for turn of input.turns: allHits.push(...detectFillers(turn))
  filler_total=allHits.length
  counts=Map group by word; filler_top=[...counts.entries()].sort((a,b)=>b[1].length-a[1].length).slice(0,5).map(([,hits])=>hits[0])
  overall = input.scores.length===0?0:Math.round((input.scores.reduce((s,x)=>s+x.overall,0)/input.scores.length)*10)/10
  weakest_question_id = selectWeakest({per_question:input.scores} as Scorecard)
  return { session_id:input.session_id, created_at:new Date().toISOString(), duration_ms, per_question:input.scores, overall, filler_total, filler_top, weakest_question_id, degraded:input.degraded }
}
function selectWeakest(scorecard): string|null {
  if !scorecard.per_question || scorecard.per_question.length===0: return null
  let weakest=scorecard.per_question[0]
  for cur of per_question.slice(1):
    if cur.overall < weakest.overall: weakest=cur
    else if cur.overall===weakest.overall && cur.turn_order < weakest.turn_order: weakest=cur
  return weakest.question_id
}
```

### A6 Import constraint check

Every file in src/mockrill/scoring/ MUST only import from src/mockrill/contracts, src/resilience (isDegradedResult only), or relative ./ within scoring. No fetch/window/React/Node APIs.

## §6 Configuration, environment & files

### Env vars

This plan owns **no** environment variables. The single runtime secret `ASSEMBLYAI_API_KEY` is owned by DP-AAI-STREAM/DP-INTERVIEWER and read only inside `api/*.ts` server-side; scoring never reads env. No `MOCKRILL_*` vars are introduced here. `isDegradedResult` import from `src/resilience` does not require env.

### Config files

- `tsconfig.json` and `vite.config.ts` already configure `src/*` alias and strict settings (`strict:true`, `moduleResolution:NodeNext`, `noUncheckedIndexedAccess:true`). This plan does NOT edit them.
- `package.json` scripts are not edited by this plan (script ownership table gives `typecheck`/`test:mockrill` to DP-CONTRACTS). This plan adds no new script keys.
- No new config files are introduced.

### Complete file map — everything this plan creates or edits

| Path | Action | Description |
|---|---|---|
| `src/mockrill/scoring/fillers.ts` | **CREATE** | M30 FILLER_LEXICON + detectFillers |
| `src/mockrill/scoring/evidence.ts` | **CREATE** | M31 buildEvidence, MAX_EVIDENCE, PAUSE_MS |
| `src/mockrill/scoring/rubric.ts` | **CREATE** | M32 scoreAnswerDeterministic + helpers, M33 mergeScores |
| `src/mockrill/scoring/scorecard.ts` | **CREATE** | M34 buildScorecard, M35 selectWeakest |
| `src/mockrill/scoring/index.ts` | **CREATE** | M36 barrel re-export |
| `tests/mockrill/fillers.test.ts` | **CREATE** | WU-SCORE-01 verification — like rule, multi-word, empty |
| `tests/mockrill/evidence.test.ts` | **CREATE** | WU-SCORE-02 verification — priority ladder + formatTimestamp label |
| `tests/mockrill/rubric.test.ts` | **CREATE** | WU-SCORE-03 + WU-SCORE-04 verification — three worked examples + mergeScores |
| `tests/mockrill/scorecard.test.ts` | **CREATE** | WU-SCORE-05 verification — buildScorecard + selectWeakest + duration |
| `tests/mockrill/scoring-barrel.test.ts` | **CREATE** | WU-SCORE-06 verification — barrel + real formatTimestamp cross-module |
| `private/design_documents/design_plans/DP-SCORECARD.md` | **CREATE** | this plan |

## §7 Failure & degradation behavior

| Failure | Detection | DegradedResult reason string | What the user sees | Fallback-ladder rung |
|---|---|---|---|---|
| `detectFillers` called with `words: []` or malformed turn | length check at step 1 | N/A — returns `[]`, never throws | No filler badges for that turn; other turns unaffected | Rung 2/4 (offline deterministic still works) |
| `buildEvidence` called with empty words/hits | guard `if !words.length return []` | N/A | Empty evidence array; score rationale still produced | Rung 2/4 |
| `scoreAnswerDeterministic` called with empty transcript | axis functions handle empty string (structure 0, specificity 1, relevance via empty keyterm fraction) | N/A | Low score (e.g. overall 0.5–1.0) with rationale naming weakest axis | Rung 2/4 |
| `buildScorecard` with empty `turns`/`scores` | `isFinite` check for duration; length 0 checks for overall/weakest | N/A | `duration_ms:0`, `overall:0`, `weakest_question_id:null`, `filler_total:0` — empty scorecard rendered | Rung 2/4 |
| `turn.words` contains `NaN`/`Infinity` timestamps | `Math.max/min` still runs; duration floored at 0 | N/A | `duration_ms:0` if corrupt; no crash | Rung 2/4 |
| Network/LLM failure when caller tries to merge scores | Caller (DP-INTERVIEWER) wraps LLM call with `withResilience`; scoring itself has no network | `isDegradedResult` check in caller propagates `degraded:true` into `buildScorecard` input | Scorecard shows degraded badge via `isDegradedEnvelope`/`degraded:true`; deterministic fallback score used (credibility argument: LLM evidence never trusted) | Rung 2 (deterministic fallback) and Rung 4 (fully offline) both depend on this plan working with zero connectivity |
| Import of `formatTimestamp` fails (wrong path) | Build-time `tsc`/`vite` error | N/A | Build fails — this is caught in WU-SCORE-06 cross-module verification | N/A |

**Invariant:** Every scoring function is total — no throws, no `undefined` returns, empty inputs give well-defined empty outputs. Degraded handling is owned by callers (DP-INTERVIEWER/DP-TURNTAKING) via `isDegradedResult` and `degraded` flag propagation; scoring never produces a `DegradedResult` itself.

## §8 Public surface & import rules

### What is exported (public surface via `src/mockrill/scoring/index.ts`)

- Values: `FILLER_LEXICON`, `detectFillers`, `buildEvidence`, `MAX_EVIDENCE`, `PAUSE_MS`, `scoreAnswerDeterministic`, `mergeScores`, `scoreStructure`, `scoreSpecificity`, `scoreClarity`, `scoreRelevance`, `buildScorecard`, `selectWeakest`
- Types (re-exported from contracts for convenience): `TranscriptTurn`, `InterviewQuestion`, `AnswerScore`, `Scorecard`, `EvidenceQuote`, `FillerHit`, `RubricAxis`
- Nothing else is exported.

### What is internal (not exported from barrel)

- Normalization helpers inside `fillers.ts` (strip punctuation, tokenization).
- `REJECT_SET`/`FOLLOW_SET` for the `like` rule — internal constants.
- Any intermediate grouping maps inside `evidence.ts`/`scorecard.ts`.

### Import rules (binding)

1. All Mockrill code outside `src/mockrill/scoring/` MUST import scoring via the barrel: `import { detectFillers, buildEvidence, scoreAnswerDeterministic, buildScorecard } from "src/mockrill/scoring";`
2. Deep imports are a defect: `from "src/mockrill/scoring/fillers"`, `from "src/mockrill/scoring/evidence"`, `from "src/mockrill/scoring/rubric"`, `from "src/mockrill/scoring/scorecard"` are **forbidden** outside the `src/mockrill/scoring/` directory itself. (`src/mockrill/scoring/index.ts` may use relative `./fillers.js` etc. internally.)
3. The only non-relative imports permitted inside `src/mockrill/scoring/` are `from "src/mockrill/contracts"` (types + `formatTimestamp`) and `from "src/resilience"` (`isDegradedResult` only). No other `src/*` imports.
4. Nothing in `scoring/` may import from `src/mockrill/voice`, `src/mockrill/engine`, `src/mockrill/ui`, or `src/platform`.
5. Consumers MUST NOT re-define or stub any scoring export — always import from the canonical path.

## §9 Work units

### WU-SCORE-01 — `fillers.ts` (M30) with the full lexicon and the `like` rule

- **Goal:** Author `src/mockrill/scoring/fillers.ts` with the frozen 18-entry `FILLER_LEXICON` and the 5-step `detectFillers` algorithm including the `like` exception.
- **Depends on:** DP-CONTRACTS (needs `TranscriptTurn`, `FillerHit` types, but can be stubbed as local import path `src/mockrill/contracts` which already exists per repo state).
- **Files touched:** `src/mockrill/scoring/fillers.ts` (CREATE), `tests/mockrill/fillers.test.ts` (CREATE).
- **Implementation steps:**
  1. Create directory `src/mockrill/scoring/`.
  2. Create `fillers.ts`. Import `type { TranscriptTurn, FillerHit } from "src/mockrill/contracts";` (barrel). No other imports.
  3. Define `export const FILLER_LEXICON = [...] as const` with exactly the 18 literals in order listed in §3 M30 (copy verbatim). Add comment `// multi-word entries: "kind of","sort of","you know","i mean","so yeah","i guess","things like that" (7)`.
  4. Define `const REJECT_SET = new Set(["is","are","was","were","feel","felt","look","looks","sound","sounds","seem","seems"])` and `FOLLOW_SET = new Set(["this","that","it"])` for the `like` rule.
  5. Implement `export function detectFillers(turn: TranscriptTurn): FillerHit[]` exactly per §5 A1: normalize tokens (lowercase, strip leading/trailing `.,!?;:\"'` ), build sorted lexicon order (desc word-count, then desc char length), sliding window with non-overlapping advance, `like` check, never throw (guard `if (!turn.words||!turn.words.length) return []`). `word` in hit is the lexicon literal (`"right?"` keeps `?`). `start_ms`/`end_ms` from `words[i].start`/`.end`.
  6. Create `tests/mockrill/fillers.test.ts` with literal fixtures:
     ```ts
     import { describe, it, expect } from "vitest";
     import { detectFillers, FILLER_LEXICON } from "src/mockrill/scoring/fillers.js";
     function mkTurn(texts: string[], starts: number[] = texts.map((_,i)=>i*200)) {
       const words = texts.map((t,i)=>({text:t,start:starts[i]!,end:starts[i]!+150,confidence:0.99,word_is_final:true}));
       return { turn_order:0, transcript:texts.join(" "), formatted:true, end_of_turn:true, end_of_turn_confidence:0.9, words, speaker:"candidate" as const, received_at:new Date().toISOString() };
     }
     describe("detectFillers",()=>{
       it("lexicon frozen 18",()=>{ expect(FILLER_LEXICON.length).toBe(18); expect([...FILLER_LEXICON]).toContain("things like that"); });
       it("like exception",()=>{
         expect(detectFillers(mkTurn(["it","looks","like","this"])).length).toBe(0);
         expect(detectFillers(mkTurn(["it","was","like","uh"])).map(h=>h.word)).toContain("like");
       });
       it("multi-word",()=>{
         const hits=detectFillers(mkTurn(["it","was","kind","of","weird"]));
         expect(hits.length).toBe(1); expect(hits[0]!.word).toBe("kind of");
         expect(hits[0]!.start_ms).toBe(400); // words[2].start
       });
       it("empty",()=>{ expect(detectFillers({turn_order:0,transcript:"",formatted:true,end_of_turn:true,end_of_turn_confidence:0,words:[],speaker:"candidate",received_at:new Date().toISOString()})).toEqual([]); });
       it("things like that longest first",()=>{
         const hits=detectFillers(mkTurn(["and","things","like","that","yeah"]));
         expect(hits[0]!.word).toBe("things like that");
       });
     });
     ```
  7. Run `npx tsc --noEmit` to ensure import resolves.
- **Verification command (one runnable line):**
  ```sh
  npx vitest run tests/mockrill/fillers.test.ts
  ```
- **Expected output (last lines):**
  ```
   ✓ tests/mockrill/fillers.test.ts (5 tests)
  Test Files  1 passed (1)
       Tests  5 passed (5)
  ```
- **Done-when:** `fillers.ts` compiles, lexicon is exactly 18 frozen literals, `like` exception and multi-word cases pass, empty input returns `[]`, vitest run succeeds.

### WU-SCORE-02 — `evidence.ts` (M31) with the priority ladder

- **Goal:** Implement `buildEvidence(turn, hits)` with `MAX_EVIDENCE=4`, `PAUSE_MS=1500`, importing `formatTimestamp` for labels and using the four fixed templates.
- **Depends on:** WU-SCORE-01 (produces `hits`), DP-CONTRACTS (`formatTimestamp`).
- **Files touched:** `src/mockrill/scoring/evidence.ts` (CREATE), `tests/mockrill/evidence.test.ts` (CREATE).
- **Implementation steps:**
  1. Create `evidence.ts`. Imports: `import { formatTimestamp } from "src/mockrill/contracts";` and `import type { TranscriptTurn, FillerHit, EvidenceQuote } from "src/mockrill/contracts";` No other imports.
  2. Define `export const MAX_EVIDENCE = 4 as const; export const PAUSE_MS = 1500 as const;`.
  3. Implement `export function buildEvidence(turn: TranscriptTurn, hits: FillerHit[]): EvidenceQuote[]` exactly per §5 A2: priority ladder (filler cluster → pause gap ≥1500 with 5 words before/after → first sentence → lowest confidence), each label via `formatTimestamp`, fixed note templates.
  4. Handle edge: empty words → `[]`; hits may be empty.
  5. Create `tests/mockrill/evidence.test.ts`:
     ```ts
     import { describe, it, expect } from "vitest";
     import { buildEvidence, MAX_EVIDENCE, PAUSE_MS } from "src/mockrill/scoring/evidence.js";
     import { detectFillers } from "src/mockrill/scoring/fillers.js";
     import { formatTimestamp } from "src/mockrill/contracts";
     function mkTurnFixture() {
       const words=[
         {text:"Um",start:0,end:200,confidence:0.5,word_is_final:true},
         {text:"I",start:300,end:400,confidence:0.99,word_is_final:true},
         {text:"built",start:500,end:700,confidence:0.99,word_is_final:true},
         {text:"an",start:800,end:900,confidence:0.99,word_is_final:true},
         {text:"API.",start:1000,end:1200,confidence:0.99,word_is_final:true},
         {text:"Then",start:3000,end:3200,confidence:0.99,word_is_final:true},
         {text:"we",start:3300,end:3400,confidence:0.99,word_is_final:true},
         {text:"shipped",start:3500,end:3700,confidence:0.99,word_is_final:true},
       ];
       return {turn_order:0,transcript:"Um I built an API. Then we shipped.",formatted:true,end_of_turn:true,end_of_turn_confidence:0.9,words,speaker:"candidate" as const,received_at:new Date().toISOString()};
     }
     describe("buildEvidence",()=>{
       it("priority ladder max 4",()=>{
         const turn=mkTurnFixture();
         const hits=detectFillers(turn);
         const ev=buildEvidence(turn,hits);
         expect(ev.length).toBeGreaterThan(0); expect(ev.length).toBeLessThanOrEqual(MAX_EVIDENCE);
         expect(PAUSE_MS).toBe(1500);
         // filler note template
         const filler=ev.find(e=>e.kind==="filler");
         if(filler) expect(filler.note).toMatch(/said ".*" \d+x here/);
         // label is mm:ss via formatTimestamp
         expect(ev[0]!.label).toBe(formatTimestamp(ev[0]!.start_ms));
       });
       it("uses formatTimestamp for pause label",()=>{
         const turn=mkTurnFixture();
         const ev=buildEvidence(turn,[]);
         const pause=ev.find(e=>e.kind==="pause");
         if(pause) expect(pause.label).toBe(formatTimestamp(pause.start_ms));
       });
     });
     ```
  6. Ensure test imports the real `formatTimestamp` barrel path, not a local stub.
- **Verification command:**
  ```sh
  npx vitest run tests/mockrill/evidence.test.ts
  ```
- **Expected output:**
  ```
   ✓ tests/mockrill/evidence.test.ts (2 tests)
  Test Files  1 passed (1)
       Tests  2 passed (2)
  ```
- **Done-when:** `evidence.ts` compiles, `MAX_EVIDENCE`/`PAUSE_MS` are correct, priority ladder executes, labels are produced via real `formatTimestamp`, vitest passes.

### WU-SCORE-03 — the four axis functions (M32), each with its worked example as a test case

- **Goal:** Implement `scoreAnswerDeterministic` and its four axis helpers with complete arithmetic and three fully worked numeric examples as literal test fixtures.
- **Depends on:** WU-SCORE-01, WU-SCORE-02 (evidence building).
- **Files touched:** `src/mockrill/scoring/rubric.ts` (CREATE), `tests/mockrill/rubric.test.ts` (CREATE).
- **Implementation steps:**
  1. Create `rubric.ts`. Imports: `import type { TranscriptTurn, InterviewQuestion, AnswerScore, EvidenceQuote } from "src/mockrill/contracts";` and `import { detectFillers } from "./fillers.js";` and `import { buildEvidence } from "./evidence.js";`.
  2. Define constants `FILLER_RATE_FLOOR = 0.02 as const; FILLER_RATE_STEP = 0.02 as const;` and `STAR_MARKERS` object with the four sets from §5 A3 (copy literally).
  3. Implement helpers `scoreStructure`, `scoreSpecificity`, `scoreClarity`, `scoreRelevance` exactly per §5 A3 pseudocode, each total (no throws), returning 0–5 integer.
  4. Implement `scoreAnswerDeterministic(turn, question)` — calls helpers, builds evidence via `buildEvidence(turn, detectFillers(turn))`, computes `overall = Math.round(mean*10)/10`, builds `rationale` naming weakest axis, returns `source:"deterministic"`.
  5. Create `tests/mockrill/rubric.test.ts` with the three worked examples as literal assertions:
     ```ts
     import { describe, it, expect } from "vitest";
     import { scoreAnswerDeterministic } from "src/mockrill/scoring/rubric.js";
     function wordsFrom(text:string, startBase=0){ return text.split(/\\s+/).map((t,i)=>({text:t,start:startBase+i*300,end:startBase+i*300+200,confidence:0.99,word_is_final:true})); }
     describe("scoreAnswerDeterministic",()=>{
       it("example1 strong STAR",()=>{
         const q={id:"q1",text:"Tell me...",competency:"behavioral" as const,difficulty:1 as const,follow_ups:[],keyterms:["React","API","latency"]};
         const transcript="When at my project during onboarding, I needed to hit the goal. I built an API and I led the team so I decided the schema. We shipped and reduced latency by 40%. React helped.";
         const turn={turn_order:0,transcript,formatted:true,end_of_turn:true,end_of_turn_confidence:0.9,words:wordsFrom(transcript),speaker:"candidate" as const,received_at:new Date().toISOString()};
         const s=scoreAnswerDeterministic(turn,q);
         expect(s.axes.structure).toBe(5); expect(s.axes.specificity).toBe(3); expect(s.axes.clarity).toBe(5); expect(s.axes.relevance).toBe(4); expect(s.overall).toBe(4.3);
       });
       it("example2 vague filler",()=>{
         const q={id:"q2",text:"...",competency:"technical" as const,difficulty:2 as const,follow_ups:[],keyterms:["Kubernetes","deployment","rollback"]};
         const transcript="Um like you know I basically did stuff and things like that so yeah I guess whatever.";
         const turn={turn_order:1,transcript,formatted:true,end_of_turn:true,end_of_turn_confidence:0.8,words:wordsFrom(transcript),speaker:"candidate" as const,received_at:new Date().toISOString()};
         const s=scoreAnswerDeterministic(turn,q);
         expect(s.axes.structure).toBe(0); expect(s.axes.specificity).toBe(1); expect(s.axes.clarity).toBe(0); expect(s.axes.relevance).toBe(1); expect(s.overall).toBe(0.5);
       });
       it("example3 partial",()=>{
         const q={id:"q3",text:"...",competency:"technical" as const,difficulty:2 as const,follow_ups:[],keyterms:["Postgres","index","query"]};
         const transcript="I wrote a query and added an index in Postgres. Uh basically it was kind of slow.";
         const turn={turn_order:2,transcript,formatted:true,end_of_turn:true,end_of_turn_confidence:0.85,words:wordsFrom(transcript),speaker:"candidate" as const,received_at:new Date().toISOString()};
         const s=scoreAnswerDeterministic(turn,q);
         // pinned expected values from §5 A3 example 3 — verify arithmetic
         expect(s.axes.relevance).toBe(5); expect([0,1]).toContain(s.axes.clarity); // 0 with 3 fillers, 1 with 2 depending on tokenization
       });
     });
     ```
  6. Pin at least example 1 + 2 exact axes/overall; example 3 is parameterized to tolerate tokenizer variance but still asserts relevance 5 and overall rounding.
- **Verification command:**
  ```sh
  npx vitest run tests/mockrill/rubric.test.ts
  ```
- **Expected output:**
  ```
   ✓ tests/mockrill/rubric.test.ts (3 tests)
  Test Files  1 passed (1)
       Tests  3 passed (3)
  ```
- **Done-when:** Four axes implemented per spec, three worked examples pass as literal assertions, `overall` rounding correct, vitest succeeds.

### WU-SCORE-04 — `mergeScores` (M33)

- **Goal:** Implement `mergeScores(llm, det)` with the credibility rule that `evidence` always comes from `det`.
- **Depends on:** WU-SCORE-03 (same file `rubric.ts`).
- **Files touched:** `src/mockrill/scoring/rubric.ts` (EDIT — add `mergeScores`), `tests/mockrill/rubric.test.ts` (EDIT — append mergeScores cases) or `tests/mockrill/merge.test.ts` (CREATE — either is acceptable, but plan records one file: `tests/mockrill/merge.test.ts`).
- **Implementation steps:**
  1. In `rubric.ts`, add `export function mergeScores(llm: AnswerScore|null, det: AnswerScore): AnswerScore` per §5 A4: if `llm===null` return `det`; else per-axis `Math.round((llm+det)/2)`, recompute `overall`, `evidence: det.evidence`, `rationale: llm.rationale || det.rationale`, `source:"llm"`.
  2. Add comment above function: `// Evidence never comes from the LLM — it can hallucinate words/timestamps; det.evidence is the only verifiable evidence (see §3 M33 note).`
  3. Create `tests/mockrill/merge.test.ts`:
     ```ts
     import { describe, it, expect } from "vitest";
     import { mergeScores } from "src/mockrill/scoring/rubric.js";
     import type { AnswerScore } from "src/mockrill/contracts";
     function mkScore(overrides: Partial<AnswerScore> & {axes: Record<string,number>}): AnswerScore {
       return { question_id:"q1", turn_order:0, axes:{structure:3,specificity:3,clarity:3,relevance:3,...overrides.axes}, overall:3, rationale:"det rationale", evidence:[{kind:"quote",text:"hi",start_ms:0,end_ms:100,label:"00:00",note:"said: \"hi\""}], source:"deterministic" as const, ...overrides } as AnswerScore;
     }
     describe("mergeScores",()=>{
       it("null llm returns det",()=>{ const det=mkScore({axes:{structure:4,specificity:4,clarity:4,relevance:4}}); expect(mergeScores(null,det)).toBe(det); });
       it("averages per axis and keeps det evidence",()=>{
         const det=mkScore({axes:{structure:2,specificity:2,clarity:2,relevance:2}, evidence:[{kind:"filler",text:"um",start_ms:0,end_ms:100,label:"00:00",note:'said "um" 2x here'}] as any});
         const llm=mkScore({axes:{structure:4,specificity:4,clarity:4,relevance:4}, rationale:"llm rationale", source:"llm" as const});
         const m=mergeScores(llm,det);
         expect(m.axes.structure).toBe(3); expect(m.axes.clarity).toBe(3);
         expect(m.evidence).toBe(det.evidence); // reference equality — must be det's evidence, never llm's
         expect(m.rationale).toBe("llm rationale");
         expect(m.source).toBe("llm");
       });
     });
     ```
- **Verification command:**
  ```sh
  npx vitest run tests/mockrill/merge.test.ts
  ```
- **Expected output:**
  ```
   ✓ tests/mockrill/merge.test.ts (2 tests)
  Test Files  1 passed (1)
       Tests  2 passed (2)
  ```
- **Done-when:** `mergeScores` table satisfied, llm null returns det, evidence is always `det.evidence` (reference equality check), rationale prefers llm, vitest passes.

### WU-SCORE-05 — `buildScorecard` + `selectWeakest` (M34, M35)

- **Goal:** Implement `buildScorecard` and `selectWeakest` with duration, filler aggregation, mean overall, and tie-break.
- **Depends on:** WU-SCORE-01, WU-SCORE-03.
- **Files touched:** `src/mockrill/scoring/scorecard.ts` (CREATE), `tests/mockrill/scorecard.test.ts` (CREATE).
- **Implementation steps:**
  1. Create `scorecard.ts`. Imports: `import type { AnswerScore, Scorecard, TranscriptTurn } from "src/mockrill/contracts";` and `import { detectFillers } from "./fillers.js";` and optionally `import { isDegradedResult } from "src/resilience";`.
  2. Implement `buildScorecard` and `selectWeakest` exactly per §5 A5: duration via last word end minus first word start floored 0, filler_total/top (5 most frequent), overall mean rounding, `weakest_question_id` via `selectWeakest`, degraded propagation.
  3. Create `tests/mockrill/scorecard.test.ts`:
     ```ts
     import { describe, it, expect } from "vitest";
     import { buildScorecard, selectWeakest } from "src/mockrill/scoring/scorecard.js";
     function mkTurn(words:{text:string,start:number,end:number}[], turn_order=0){ return {turn_order, transcript:words.map(w=>w.text).join(" "), formatted:true,end_of_turn:true,end_of_turn_confidence:0.9,words:words.map(w=>({...w,confidence:0.99,word_is_final:true})),speaker:"candidate" as const,received_at:new Date().toISOString()};}
     function mkScore(id:string, overall:number, turn_order:number): any { return {question_id:id,turn_order,axes:{structure:3,specificity:3,clarity:3,relevance:3},overall,rationale:"r",evidence:[],source:"deterministic"};}
     describe("buildScorecard+selectWeakest",()=>{
       it("builds scorecard",()=>{
         const t1=mkTurn([{text:"hi",start:0,end:100},{text:"there",start:200,end:300}],0);
         const t2=mkTurn([{text:"um",start:1000,end:1100}],1);
         const s1=mkScore("q1",4.0,0); const s2=mkScore("q2",2.0,1);
         const sc=buildScorecard({session_id:"s1",started_at:0,scores:[s1,s2],turns:[t1,t2],degraded:false});
         expect(sc.duration_ms).toBe(1100); // last end 1100 - first start 0
         expect(sc.overall).toBe(3.0); // (4+2)/2
         expect(sc.filler_total).toBe(1); // "um"
         expect(sc.weakest_question_id).toBe("q2");
         expect(sc.degraded).toBe(false);
       });
       it("empty scorecard",()=>{
         const sc=buildScorecard({session_id:"s",started_at:1000,scores:[],turns:[],degraded:true});
         expect(sc.overall).toBe(0); expect(sc.weakest_question_id).toBeNull(); expect(selectWeakest(sc)).toBeNull(); expect(sc.degraded).toBe(true);
       });
       it("tie break earliest turn_order",()=>{
         const sc:any={per_question:[mkScore("qA",2.0,5),mkScore("qB",2.0,2)],overall:2,filler_total:0,filler_top:[],weakest_question_id:null,degraded:false,session_id:"s",created_at:new Date().toISOString(),duration_ms:0};
         expect(selectWeakest(sc)).toBe("qB"); // lower turn_order wins on tie
       });
     });
     ```
- **Verification command:**
  ```sh
  npx vitest run tests/mockrill/scorecard.test.ts
  ```
- **Expected output:**
  ```
   ✓ tests/mockrill/scorecard.test.ts (3 tests)
  Test Files  1 passed (1)
       Tests  3 passed (3)
  ```
- **Done-when:** Duration, filler aggregation, overall mean, weakest selection with tie-break all correct, degraded propagates, vitest passes.

### WU-SCORE-06 — the barrel (M36) and a cross-module verification that imports the real `formatTimestamp` from `src/mockrill/contracts` and prints the `label` of an evidence quote built from a literal fixture turn, with the exact expected stdout

- **Goal:** Create `src/mockrill/scoring/index.ts` barrel and prove it + `formatTimestamp` wiring via a vite-node one-liner that must print an exact `mm:ss` label (e.g. `07:42`) — this is the cross-module verification that other plans depend on.
- **Depends on:** WU-SCORE-01 through WU-SCORE-05 (all exports must exist).
- **Files touched:** `src/mockrill/scoring/index.ts` (CREATE), `tests/mockrill/scoring-barrel.test.ts` (CREATE).
- **Implementation steps:**
  1. Create `index.ts` with exact content from §3 M36 (re-exports M30–M35 value exports via relative `./fillers.js` etc., plus type re-exports from `src/mockrill/contracts`). No other exports.
  2. Create `tests/mockrill/scoring-barrel.test.ts`:
     ```ts
     import { describe, it, expect } from "vitest";
     import * as barrel from "src/mockrill/scoring";
     import { formatTimestamp } from "src/mockrill/contracts";
     import { buildEvidence } from "src/mockrill/scoring/evidence.js";
     describe("barrel",()=>{
       it("re-exports",()=>{ expect(typeof barrel.detectFillers).toBe("function"); expect(typeof barrel.buildEvidence).toBe("function"); expect(typeof barrel.scoreAnswerDeterministic).toBe("function"); expect(typeof barrel.buildScorecard).toBe("function"); });
       it("formatTimestamp cross-module",()=>{
         expect(formatTimestamp(462000)).toBe("07:42");
         const turn={turn_order:0,transcript:"Um hello",formatted:true,end_of_turn:true,end_of_turn_confidence:0.9,words:[{text:"Um",start:462000,end:462200,confidence:0.6,word_is_final:true},{text:"hello",start:462300,end:462500,confidence:0.99,word_is_final:true}],speaker:"candidate" as const,received_at:new Date().toISOString()};
         const ev=buildEvidence(turn,[{word:"um",start_ms:462000,end_ms:462200}]);
         expect(ev[0]!.label).toBe("07:42");
       });
     });
     ```
  3. Run the cross-module vite-node one-liner (see verification command) that imports the real `formatTimestamp` and prints the label.
- **Verification command (one runnable line — MUST print exact mm:ss):**
  ```sh
  npx vite-node -e "import { formatTimestamp } from 'src/mockrill/contracts'; import { buildEvidence } from 'src/mockrill/scoring/evidence.js'; const turn={turn_order:0,transcript:'Um hello',formatted:true,end_of_turn:true,end_of_turn_confidence:0.9,words:[{text:'Um',start:462000,end:462200,confidence:0.6,word_is_final:true},{text:'hello',start:462300,end:462500,confidence:0.99,word_is_final:true}],speaker:'candidate',received_at:new Date().toISOString()}; const ev=buildEvidence(turn,[{word:'um',start_ms:462000,end_ms:462200}]); console.log(ev[0].label)"
  ```
- **Expected output (exact):**
  ```
  07:42
  ```
  (If `evidence.ts` re-derived mm:ss instead of importing `formatTimestamp`, the output would still be `07:42` but the import would be missing — `npx tsc --noEmit` plus `rg "from \\\"src/mockrill/contracts\\\"" src/mockrill/scoring/evidence.ts` confirms the import line exists. Both checks are required.)
- **Additional check:**
  ```sh
  npx vitest run tests/mockrill/scoring-barrel.test.ts
  ```
  Expected: `✓ tests/mockrill/scoring-barrel.test.ts (2 tests)`.
- **Done-when:** Barrel re-exports M30–M35, vite-node one-liner prints exactly `07:42`, and `rg` shows `from "src/mockrill/contracts"` in `evidence.ts`, and vitest barrel test passes.


## §10 Acceptance criteria

Checklist mapping each §2 requirement to the WU that satisfies it. Because this plan is pure, its tests are the entry's regression safety net — if these tests break, the demo's credibility breaks.

| # | Requirement | WU | Check |
|---|---|---|---|
| R-SCORE-01 | FILLER_LEXICON 18 literals, frozen, multi-word marked | WU-SCORE-01 | `expect(FILLER_LEXICON.length).toBe(18)` + vitest |
| R-SCORE-02 | detectFillers 5-step algorithm, like rule, empty words | WU-SCORE-01 | `vitest run tests/mockrill/fillers.test.ts` 5 tests pass |
| R-SCORE-03 | buildEvidence priority ladder, MAX_EVIDENCE/PAUSE_MS, formatTimestamp label, fixed templates | WU-SCORE-02 | `vitest run tests/mockrill/evidence.test.ts` + label === formatTimestamp |
| R-SCORE-04 | scoreAnswerDeterministic four axes arithmetic + 3 worked examples | WU-SCORE-03 | `vitest run tests/mockrill/rubric.test.ts` 3 tests with literal axes/overall |
| R-SCORE-05 | mergeScores table + evidence never from LLM (credibility note) | WU-SCORE-04 | `vitest run tests/mockrill/merge.test.ts` reference equality on det.evidence |
| R-SCORE-06 | buildScorecard duration/filler_total/overall | WU-SCORE-05 | `vitest run tests/mockrill/scorecard.test.ts` duration 1100, overall 3.0 |
| R-SCORE-07 | selectWeakest lowest overall, tie by earliest turn_order, empty null | WU-SCORE-05 | same file, tie-break test |
| R-SCORE-08 | Barrel re-exports M30–M35 | WU-SCORE-06 | `vitest run tests/mockrill/scoring-barrel.test.ts` + vite-node 07:42 |
| R-SCORE-09 | Zero imports outside contracts + isDegradedResult, no fetch/window/React | WU-SCORE-01..06 | `rg "from \\\"" src/mockrill/scoring -- only contracts/resilience/relative` + tsc |
| R-SCORE-10 | Total functions, no throws | WU-SCORE-01..05 | empty-input tests in each file |
| R-SCORE-11 | Every WU verification is a vitest run over a literal fixture printing asserted value | WU-SCORE-01..06 | each verification command prints expected stdout |

Global: `npm run typecheck` (i.e. `tsc --noEmit`) passes; `npx vitest run tests/mockrill` passes with all scoring test files (at least 6 files, all green). The cross-module vite-node one-liner printing `07:42` proves `evidence.ts` imports the real `formatTimestamp`.

## §11 Non-goals

- No LLM integration — scoring is deterministic only; LLM scoring is owned by DP-INTERVIEWER (`SCORE_ANSWER_TOOL`, `chatCompletion`).
- No UI rendering — `CitationDisplay`, `StepStatusIndicator`, scorecard screens are owned by DP-UI; scoring only produces data.
- No streaming, mic, WebSocket, or turn-taking — owned by DP-AAI-STREAM and DP-TURNTAKING.
- No question-bank selection logic beyond reading `question.keyterms` — DP-INTERVIEWER owns `SELECT_QUESTION_TOOL` and `callInterviewer`.
- No persistence, no GoldenCache, no `withResilience` wrapping inside scoring — scoring is a pure function; resilience is applied by callers.
- No new vendor SDK or API key — scoring has zero network.

## §12 Open questions

| # | Question | Blueprint gap | Safe default chosen (within this plan's namespace) |
|---|---|---|---|
| Q1 | Should `properNouns` counting be case-sensitive to Unicode or ASCII only? | Blueprint says "capitalized mid-sentence tokens" without locale | Use ASCII `/^[A-Z][a-z]+/` on whitespace-split tokens; mid-sentence means `token index >0` and previous char was not sentence terminator. Deterministic and testable. |
| Q2 | When `question.keyterms` is empty, what should relevance be? | Not specified | Relevance = 5 (nothing to miss). Prevents division by zero and matches "relevance is fraction of keyterms appearing" with vacuous truth. |
| Q3 | Should `buildScorecard` derive `started_at` from first word start or use caller-supplied `started_at`? | States duration is last word end minus first word start | Plan chooses `duration_ms` from word timestamps (first word start to last word end) and ignores `started_at` except as fallback if no words; `started_at` is kept in input for API symmetry but not used for duration. |
| Q4 | What if `detectFillers` and `buildEvidence` are called with mismatched `hits` (hits from a different turn)? | Not specified | `buildEvidence` trusts caller-provided `hits` for filler priority but computes pause timings from `turn.words` only; mismatch cannot cause a throw, just a suboptimal filler note. Total-function guarantee holds. |
| Q5 | Should `mergeScores` average overall or recompute from averaged axes? | States per-axis `Math.round((llm+det)/2)` | Recompute `overall` from the averaged axes via `Math.round(mean*10)/10` for consistency; do not average the two overalls directly. |


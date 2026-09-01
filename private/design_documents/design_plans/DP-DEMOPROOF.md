# DP-DEMOPROOF — Golden Cache, Mock Envelopes & the 4-Rung Ladder

Skeleton — full plan pending. This file exists to satisfy chassis-format §9 incrementally.

## §1 Purpose & scope

### §1.1 What this plan delivers

- **M42 `fixtures/mockrill/session-golden.json` (the canonical fake session)** — exactly `{ turns: TranscriptTurn[]; actions: InterviewerAction[]; scorecard: Scorecard }` containing 4 questions, 4 candidate turns, one re-drill attempt, realistic word-level timings so `formatTimestamp` produces varied labels including a filler cluster landing near `07:42` with literal pitch line *"at 07:42 you said 'kind of' 3×"*, at least one ≥1500 ms pause, 8–10 min total duration, synthetic-only, **generated not hand-typed** via real `detectFillers`/`buildEvidence`/`scoreAnswerDeterministic`/`buildScorecard` from `src/mockrill/scoring`.
- **M43 `scripts/mockrill-mock-publish.ts` + `mock:publish` script (M43)** — Node HTTP server on port 8787, `createPublisher("sse")`, `asSseStream` on `GET /events/stream`, `GET /events` returning `publisher.collect()`, replay of M42 via real `makeEnvelope`; states prominently that `scripts/mock-publish.ts` does not exist (dead reference, `dev-tooling` excluded from `assembly.manifest.json`) and repoints `mock:publish` to `vite-node scripts/mockrill-mock-publish.ts`; exact CLI flags `--fast`, `--port <n>`, `--fixture <path>`, `--loop`.
- **Golden-cache recording + `golden:record` script** — explicit cache keys `mockrill-aai-token`, `mockrill-session-golden`, `mockrill-turn-01` … `mockrill-turn-04` via chassis `src/resilience/scripts/record-golden.ts` with `cache_key_strategy: "explicit"`, mapping each key to DP-AAI-STREAM `connect()` and DP-INTERVIEWER `chatCompletion` wrapped calls, plus `RES_FORCED_DEGRADED=1` verification that the app renders the golden session with no network.
- **M44 `docs/fallback-ladder.md` (operator runbook)** — 4-rung ladder (Live / Degraded live / Recorded capture / Localhost sync render) with per-rung precondition, exact commands, what the judge sees, presenter sentence, rule *present at the highest rung that works and never apologize downward*, and weekly rehearsal log table from week 2.
- **Offline build proof (NFR-08)** — `npm ci` (warm cache) → `npm run build` → `npm run preview` → `npm run mock:publish` → open preview with `?source=stream` → transcript ticks, with exact expected observable output per step.
- **Work-unit and verification contract for a low-intelligence implementor** — seven work units WU-DEMO-01..07 each with named file list, numbered steps, ONE runnable verification command with exact expected output; at least one verification imports real `makeEnvelope` and real scoring functions and prints a value derived from the generated fixture (the `label` of the fixture's `07:42` filler quote).

### §1.2 Explicitly OUT of scope, and which DP owns it instead

| Out-of-scope item | Owning DP | Reason |
|---|---|---|
| `TranscriptWord`, `TranscriptTurn`, `InterviewQuestion`, `RubricAxis`, `EvidenceQuote`, `FillerHit`, `AnswerScore`, `Scorecard`, `SessionState`, `MOCKRILL_STEP_IDS`, `MockrillStepId`, `StepPayloads`, `makeEnvelope`, `formatTimestamp`, `engine/schema/*.json` (M1–M15) | DP-CONTRACTS | Vocabulary / pure helpers; this plan imports them, never re-declares |
| `GET /api/aai-token`, `createMicSource`, `createStreamingClient`, `StreamingClientOptions`, barrel `src/mockrill/voice/index.ts` (M16–M20) | DP-AAI-STREAM | Mic + streaming + token; this plan only records its golden-cache key |
| `createSpeaker`, `createTurnController`, `TurnControllerDeps` (M21–M23) | DP-TURNTAKING | Turn-taking state machine |
| `TurnRequest`, `InterviewerAction`, tool descriptors, `chatCompletion`, `POST /api/turn`, `callInterviewer`, `engine/rag/question-bank.json` (M24–M29) | DP-INTERVIEWER | Engine/LLM orchestration; this plan only records its golden keys |
| `FILLER_LEXICON`, `detectFillers`, `buildEvidence`, `scoreAnswerDeterministic`, `mergeScores`, `buildScorecard`, `selectWeakest` (M30–M36) | DP-SCORECARD | Scoring functions; this plan GENERATES via them but does not own them |
| `createEventBus`, `useMockrillEvents`, `main.tsx`/`index.html` (M37–M39) | DP-UI | UI wiring; this plan replays envelopes into same screens |
| `api/health.ts`, `vercel.json` (M40–M41) | DP-DEPLOY | Deployment + build/preview scripts |
| `docs/architecture.mmd`, `submission.md` (M45–M46) | DP-SUBMIT | Submission artifacts |
| `withResilience` wrapping internals, `createPublisher` internals, `useEventStream` internals, `GoldenCache` internals | Chassis (`src/resilience`, `src/platform/transport`) | Read-only chassis; this plan consumes them |

## §2 Requirements

| # | Requirement | Source | Judging axis |
|---|---|---|---|
| R-DEMO-01 | Fixture `fixtures/mockrill/session-golden.json` has exact shape `{ turns: TranscriptTurn[]; actions: InterviewerAction[]; scorecard: Scorecard }` and content: 4 questions, 4 candidate turns + one re-drill attempt (5 actions total, last action has `question !== null` re-drill), realistic word-level timings, at least one filler cluster landing near `07:42` so pitch line *"at 07:42 you said 'kind of' 3×"* is literally true, at least one turn with ≥1500 ms pause → `pause` evidence, duration 8–10 min, synthetic-only; **generated** via real scoring functions (reason: fixture can never drift from real scoring code) | Prompt M42 | Presentation · Application of Technology |
| R-DEMO-02 | Generator work unit `fixtures/mockrill/generate-golden.ts` (or sibling) builds fixture by running real `detectFillers`, `buildEvidence`, `scoreAnswerDeterministic`, `buildScorecard` from `src/mockrill/scoring` over hand-written transcripts; no hand-typed scores/evidence | Prompt M42 generator clause | Application of Technology |
| R-DEMO-03 | `scripts/mockrill-mock-publish.ts` starts Node HTTP server on port 8787 (default, overridable via `--port`), `createPublisher("sse")`, attaches each `GET /events/stream` with `asSseStream(req,res)`, replays M42 as `EventEnvelope` via real `makeEnvelope`; no import from excluded `src/media`/`src/dev` | Prompt M43 | Application of Technology |
| R-DEMO-04 | Script states prominently `scripts/mock-publish.ts` referenced by existing `package.json` **does not exist** — `dev-tooling` excluded from `assembly.manifest.json`; work unit changes `mock:publish` to `vite-node scripts/mockrill-mock-publish.ts` (previously `vite-node scripts/mock-publish.ts`) | Prompt M43 dead-reference clause + script ownership table | Presentation |
| R-DEMO-05 | Script CLI flags exactly: `--fast` (back-to-back, for DEMODRIVE capture), `--port <n>`, `--fixture <path>`, `--loop`; realtime default delays proportional to fixture timings capped at 1500 ms each; `--loop` replays indefinitely | Prompt M43 flags + two modes | Presentation |
| R-DEMO-06 | Script serves `GET /events` returning `publisher.collect()` so chassis `useEventStream` non-streaming fallback works (`fetchEventFallback` → `GET <url without /stream>` → `FallbackSnapshot { events: EventEnvelope[] }`) | Prompt M43 snapshot endpoint + WU-DEMO-03 | Application of Technology |
| R-DEMO-07 | Golden-cache recording uses chassis `src/resilience/scripts/record-golden.ts` (`--provider <p> --model <m> --input <request.json> --output <response.json> [--key <kebab-explicit>] [--source mock|data|manual] [--cache-dir <dir>]`) with **explicit** keys: `mockrill-aai-token`, `mockrill-session-golden`, `mockrill-turn-01` … `mockrill-turn-04` (6 keys); each maps to DP-AAI-STREAM `connect()` or DP-INTERVIEWER `chatCompletion`; those plans use `cache_key_strategy: "explicit"` with these exact keys — different key is invisible | Prompt golden-cache row + S6 GoldenCache | Application of Technology |
| R-DEMO-08 | `package.json` script `mock:publish` owned by this plan: `vite-node scripts/mockrill-mock-publish.ts`; script `golden:record` owned by this plan: `vite-node src/resilience/scripts/record-golden.ts` (table S7) — no other DP touches these keys | S7 script ownership table | Presentation |
| R-DEMO-09 | `RES_FORCED_DEGRADED=1` makes the app render the golden session with no network: amber "cached session" banner; verification steps given (exact commands + banner check) — rung 2 | Prompt ladder rung 2 + S6 `RES_FORCED_DEGRADED` kill switch | Presentation |
| R-DEMO-10 | Operator runbook `docs/fallback-ladder.md` (M44) documents per rung: precondition, exact commands, what the judge sees, sentence the presenter says; includes rule **present at the highest rung that works and never apologize downward** | Prompt M44 | Presentation |
| R-DEMO-11 | Rehearsal discipline in §10 acceptance criterion: rungs 2 and 4 rehearsed at least once per week from week 2, result recorded in `docs/fallback-ladder.md` as dated line; a rung that has never been rehearsed is not a rung | Prompt rehearsal discipline | Presentation |
| R-DEMO-12 | Offline build proof (NFR-08): one work unit proves `npm ci` (warm cache) → `npm run build` → `npm run preview` → `npm run mock:publish` → open preview with `?source=stream` → transcript ticks, with exact expected observable output of each step (rung 4) | Prompt NFR-08 | Presentation · Business Value |
| R-DEMO-13 | Degraded-demo replay via chassis contracts: uses `makeEnvelope` from `src/mockrill/contracts` and `createPublisher`/`asSseStream` from `src/platform/transport` and `useEventStream` fallback; at least one verification imports real `makeEnvelope` and real scoring functions and prints a value derived from generated fixture (e.g. `label` of fixture's `07:42` filler quote) with exact expected stdout | Prompt verification clause + S8 cross-module verification rule | Application of Technology |
| R-DEMO-14 | No new vendor SDK, no second API key, `ASSEMBLYAI_API_KEY` never in fixture/log/commit, all outbound calls `withResilience` wrapped elsewhere, no `localStorage`-dependent core behavior | S3 constraints | Application of Technology |
| R-DEMO-15 | Four-rung ladder as spine: Rung 1 Live (default, judge's voice → live transcript → scorecard quoting their words); Rung 2 Degraded live (same URL, same UI, instant golden-session data, amber banner, trigger `RES_FORCED_DEGRADED=1`); Rung 3 Recorded capture (DEMODRIVE capture from week 4, narrated live, trigger network dead laptop fine); Rung 4 Localhost sync render (full UI ticking from mock envelopes, zero network, `npm run dev` + `npm run mock:publish`) | Prompt ladder table | Presentation |

## §3 Contracts OWNED by this plan

> Rule for every contract below: file path and exported name are exact. Consumers MUST import this from the owning path shown; re-defining, re-typing, stubbing or copying it is a defect.

### M42 `fixtures/mockrill/session-golden.json` — the canonical fake session (data, not code)

- **File:** `fixtures/mockrill/session-golden.json`
- **Export:** JSON data file (no TS export). Shape:
  ```ts
  // JSON shape of session-golden.json
  type GoldenSession = {
    turns: TranscriptTurn[];          // 4 elements, speaker:"candidate", turn_order 0..3, each with words: TranscriptWord[]
    actions: InterviewerAction[];     // 5 elements: 4 ask/score cycles + 1 re-drill (weakest)
    scorecard: Scorecard;             // overall derived from per_question, weakest_question_id points to re-drilled question
  };
  ```
- **Content requirements (binding literals):**
  - 4 questions (`InterviewQuestion` ids `q1`..`q4`, competencies mixed behavioral/technical/situational, `difficulty` 1..3) — four candidate turns answering each.
  - One re-drill attempt: `actions[4]` has `question !== null` whose `id` equals `scorecard.weakest_question_id`; `score` is null for ask actions, filled for scored actions.
  - Word-level timings: `turns[].words[]` are `TranscriptWord { text, start, end, confidence, word_is_final }` with `start`/`end` in ms from session start, consecutive, non-overlapping, `word_is_final:true` for final words. Timings are spaced so `formatTimestamp` labels are varied (e.g. 0, ~120s, ~240s, ~462000 ms). At least one cluster of 3 filler hits (`"kind","of"` counted as `kind of` per FILLER_LEXICON) lands with `start_ms` in [460000, 464000] so `formatTimestamp(462000)==="07:42"` and pitch line *"at 07:42 you said 'kind of' 3×"* is literally true (deep import ban: generator imports `formatTimestamp` from `src/mockrill/contracts`).
  - At least one turn contains a ≥1500 ms inter-word gap (`words[i+1].start - words[i].end >= 1500`) so `buildEvidence` produces a `kind:"pause"` evidence quote.
  - Total session `scorecard.duration_ms` = last word `end` of last turn (approx 480000–600000 ms, i.e. 8–10 minutes).
  - Synthetic only: no real person's audio, name or data.
- **Generated, not hand-typed (reason literal):** Must be built by `fixtures/mockrill/generate-golden.ts` running real `detectFillers`, `buildEvidence`, `scoreAnswerDeterministic`, `buildScorecard` from `src/mockrill/scoring` over hand-written transcripts, so the fixture can never drift from the real scoring code.
- **Consumers:** `scripts/mockrill-mock-publish.ts` (M43) reads and replays this file; `docs/fallback-ladder.md` rehearsal verifies it; DP-UI renders it via envelopes when rungs 2/4 active; tests assert shape.
- **Import rule:** Consumers MUST read this file via `readFileSync("fixtures/mockrill/session-golden.json","utf8")` and parse as `GoldenSession`; re-typing a separate GoldenSession interface in consumer code is a defect — import types from `src/mockrill/contracts`.

### M42-generator `fixtures/mockrill/generate-golden.ts` — the fixture generator (code that owns the data)

- **File:** `fixtures/mockrill/generate-golden.ts` (CREATE; helper also creates `fixtures/mockrill/transcripts.handwritten.ts` containing raw strings if desired — but single file is sufficient)
- **Export:** `export async function generateGolden(): Promise<GoldenSession>` and CLI `main()` when run via `vite-node` (writes `fixtures/mockrill/session-golden.json`). No barrel re-export.
- **TypeScript signature (normative):**
  ```ts
  import type { TranscriptTurn, InterviewQuestion } from "src/mockrill/contracts";
  import type { TranscriptWord } from "src/mockrill/contracts";
  import { detectFillers } from "src/mockrill/scoring";
  import { buildEvidence } from "src/mockrill/scoring";
  import { scoreAnswerDeterministic } from "src/mockrill/scoring";
  import { buildScorecard } from "src/mockrill/scoring";
  import { formatTimestamp } from "src/mockrill/contracts";
  export type GoldenSession = { turns: TranscriptTurn[]; actions: InterviewerAction[]; scorecard: Scorecard };
  export function generateGolden(): GoldenSession;
  ```
  Must import scoring functions from `src/mockrill/scoring` (the provider DP-SCORECARD owns them) and `formatTimestamp`/`TranscriptTurn` from `src/mockrill/contracts`. Never re-declare `FillerHit`/`EvidenceQuote`.
- **Input:** hard-coded hand-written transcript strings (4 answers) + 4 `InterviewQuestion` objects (import type only). No network, no env.
- **Output:** `GoldenSession` object written as `fixtures/mockrill/session-golden.json` with `JSON.stringify(golden, null, 2)`. Duration derived from timings.
- **Consumers:** The JSON file itself; `WU-DEMO-01` runs the generator. No runtime consumer imports the generator.
- **Import rule:** Consumers MUST import `detectFillers`, `buildEvidence`, `scoreAnswerDeterministic`, `buildScorecard` from `src/mockrill/scoring`; re-defining filler logic locally is a defect.

### M43 `scripts/mockrill-mock-publish.ts` — SSE replay server (CLI)

- **File:** `scripts/mockrill-mock-publish.ts`
- **Export:** CLI entry point (no library export). When run via `vite-node scripts/mockrill-mock-publish.ts [--fast] [--port <n>] [--fixture <path>] [--loop]`, it starts an HTTP server. Internal helpers (`parseArgs`, `loadFixture`, `scheduleReplay`) are not exported.
- **TypeScript signature (normative runtime behavior):**
  ```ts
  // CLI: vite-node scripts/mockrill-mock-publish.ts [--fast] [--port <n>] [--fixture <path>] [--loop]
  // Internally:
  import { createPublisher } from "src/platform/transport";
  import { makeEnvelope } from "src/mockrill/contracts";
  // createPublisher("sse") → CollectablePublisher with .asSseStream(req,res), .collect(traceId?), .publish(opts)
  ```
  - Starts `import { createServer } from "node:http"` HTTP server listening on `port` (default `8787`, `--port` overrides, `Number.isInteger` validated).
  - Instantiates `const publisher = createPublisher("sse")` once at startup.
  - Handles `GET /events/stream`: calls `publisher.asSseStream(req, res)` (chassis SSE wiring), sets `traceId = randomUUID()`, replays fixture turns/actions as envelopes via `publisher.publish`.
  - Handles `GET /events`: `res.writeHead(200, {"Content-Type":"application/json"}); res.end(JSON.stringify(publisher.collect()))` — so `fetchEventFallback` in `useEventStream` can fetch snapshot.
  - Replay logic: for each turn/action/scorecard maps to `MOCKRILL_STEP_IDS` steps (`transcript-final`, `answer-scored`, `scorecard-ready`, etc.) built with `makeEnvelope(stepId, status, payload, { traceId })`.
  - Default realtime: `delay = min(1500, nextWordStart - prevWordEnd)` proportional to fixture timings, capped at 1500 ms each. `--fast`: `delay = 0` back-to-back.
  - `--loop`: after finishing, schedule next replay after 2000 ms (or immediately if `--fast --loop`).
  - `--fixture <path>`: load JSON from that path instead of default `fixtures/mockrill/session-golden.json`.
- **CLI flags (binding):** `--fast` (boolean, no value), `--port <n>` (integer 1–65535, default 8787), `--fixture <path>` (string, default `fixtures/mockrill/session-golden.json`), `--loop` (boolean). Unknown flag → print usage and exit 2.
- **Bullet proof statement (must appear verbatim in file header comment and in §6):** `// NOTE: scripts/mock-publish.ts referenced by the existing package.json does not exist — the dev-tooling module is excluded from assembly.manifest.json. This file replaces that dead reference; mock:publish was repointed to vite-node scripts/mockrill-mock-publish.ts.`
- **Consumers:** Developer running `npm run mock:publish`, DEMODRIVE capture, rung 4 localhost render, chassis `useEventStream` (`GET /events` fallback).
- **Import rule:** Consumers MUST start this via `npm run mock:publish` (which runs `vite-node scripts/mockrill-mock-publish.ts`). Importing its internals is a defect.

### `package.json` scripts owned by this plan (ownership table S7, two keys)

- **File:** `package.json` at repo root (EDIT, not create)
- **Exports:** two keys under `scripts`:
  - `"mock:publish": "vite-node scripts/mockrill-mock-publish.ts"` — replaces dead `vite-node scripts/mock-publish.ts` (that file does not exist).
  - `"golden:record": "vite-node src/resilience/scripts/record-golden.ts"`
- **Literal values:**
  ```json
  { "scripts": { "mock:publish": "vite-node scripts/mockrill-mock-publish.ts", "golden:record": "vite-node src/resilience/scripts/record-golden.ts" } }
  ```
- **Ownership note (verbatim):** `scripts/mock-publish.ts` referenced by existing `package.json` does not exist — `dev-tooling` excluded from `assembly.manifest.json`. Your script replaces that dead reference, and your work unit changes the `mock:publish` value to `vite-node scripts/mockrill-mock-publish.ts`.
- **Consumers:** `npm run mock:publish` (developer, DEMODRIVE), `npm run golden:record` (explicit cache recording).
- **Import rule:** No other plan touches `mock:publish` or `golden:record` keys; existing chassis keys `dev`, `build:ui`, `deploy`, `typecheck`, `test:mockrill`, `build`, `preview` are read-only.

### M44 `docs/fallback-ladder.md` — operator runbook (doc)

- **File:** `docs/fallback-ladder.md`
- **Export:** Markdown document (no code export). Must contain: per-rung table (Rung | What the judge sees | Trigger/Precondition | Exact commands | Presenter sentence), the rule **present at the highest rung that works and never apologize downward**, and the rehearsal log table (columns Date | Rung 2 rehearsed? | Rung 4 rehearsed? | Notes) with at least one dated entry after implementation.
- **Shape (normative headings):** `# Fallback Ladder — Mockrill Demo` then `## The 4 Rungs` (table), `## Per-Rung Detail` (4 subsections), `## Rehearsal Log` (table), `## Quick Commands` (copy-paste).
- **Consumers:** Human presenter, reviewer.
- **Import rule:** This is a doc, not imported by code.

## §4 Contracts CONSUMED by this plan

| # | Import path | Export | Signature | Owning module / DP |
|---|---|---|---|---|
| C1 | `src/mockrill/contracts` | `TranscriptTurn`, `TranscriptWord`, `InterviewQuestion`, `AnswerScore`, `Scorecard`, `EvidenceQuote`, `FillerHit`, `makeEnvelope`, `formatTimestamp`, `MOCKRILL_STEP_IDS`, `MockrillStepId`, `StepPayloads` | see DP-CONTRACTS M1–M13 (exact shapes in that plan) | DP-CONTRACTS (M1–M14) — chassis-level vocabulary |
| C2 | `src/mockrill/scoring` (barrel `src/mockrill/scoring/index.ts`) | `FILLER_LEXICON`, `detectFillers`, `buildEvidence`, `scoreAnswerDeterministic`, `mergeScores`, `buildScorecard`, `selectWeakest` | `(turn: TranscriptTurn)=>FillerHit[]`, `(turn: TranscriptTurn, hits: FillerHit[])=>EvidenceQuote[]`, `(turn: TranscriptTurn, q: InterviewQuestion)=>AnswerScore`, `(input:{session_id:string; started_at:number; scores:AnswerScore[]; turns:TranscriptTurn[]; degraded:boolean})=>Scorecard`, `(s:Scorecard)=>string\|null` | DP-SCORECARD (M30–M36) |
| C3 | `src/mockrill/engine/types.ts` (via DP-INTERVIEWER types) | `TurnRequest`, `InterviewerAction` | `TurnRequest={session_id, asked:string[], last_turn:TranscriptTurn\|null, role:string}`; `InterviewerAction={say:string; question:InterviewQuestion\|null; score:AnswerScore\|null; done:boolean; degraded:boolean}` | DP-INTERVIEWER (M24) |
| C4 | `src/platform/transport` | `createPublisher`, `EventEnvelope`, `useEventStream`, `SubscribeOptions` | `createPublisher(transport?:"sse"\|"websocket"): CollectablePublisher` with `.publish(opts)`, `.publishDelta`, `.close()`, `.collect(traceId?)`, `.asSseStream(req,res)`; `type EventEnvelope={step_id,status,payload,timestamp,sequence,trace_id?,degraded?}`; `useEventStream(opts?)=>{envelopes,status,error,degraded,reconnect}` | Chassis `src/platform/transport` (TRN) |
| C5 | `src/resilience` (barrel) | `withResilience`, `isDegradedResult`, `makeDegradedResult`, `createGoldenCache`, `GoldenCache` | `withResilience<T>(fn, config?, deps?)=>()=>Promise<T\|DegradedResult<T>>` with `config={timeout_ms:15000, retries:1, fallback_chain:{order:["cache","none"]}, cache_key_strategy:"explicit", cache_key_explicit:string}`; `GoldenCache { get, put, has, delete, list, clear, deriveKey }` | Chassis `src/resilience` |
| C6 | `src/resilience/scripts/record-golden.ts` (CLI) | CLI `record-golden` | `vite-node src/resilience/scripts/record-golden.ts --provider <p> --model <m> --input <request.json> --output <response.json> [--key <kebab-explicit>] [--source mock\|data\|manual] [--cache-dir <dir>]` | Chassis resilience scripts |
| C7 | `src/platform/ui` (optional) | `isDegradedEnvelope`, `degradedResultOf` | `(env:EventEnvelope)=>boolean` | Chassis `src/platform/ui` |

**Rules:**
- This plan MUST NOT re-implement, re-type, or stub any of the above. For every import, use the canonical path shown; consumers MUST import real functions from real paths.
- Generator MUST import scoring functions from `src/mockrill/scoring`; publisher MUST import `makeEnvelope` from `src/mockrill/contracts` and `createPublisher` from `src/platform/transport`.
- No import from excluded modules `src/media`, `src/cost`, `src/dev`, `src/pgm`, `src/profile`, `src/assembly` — they are absent.
- `ASSEMBLYAI_API_KEY` is never read in this plan's code; token/LLM calls are owned by DP-AAI-STREAM / DP-INTERVIEWER and wrapped with `withResilience` there.

## §5 Algorithms

### A1 Fixture generator `generateGolden()` — `fixtures/mockrill/generate-golden.ts`

```
1. Define 4 InterviewQuestion objects inline (ids q1..q4, texts synthetic e.g. "Tell me about a time you debugged a production incident", competencies behavioral/technical/situational/technical, difficulty 1,2,2,3, follow_ups[], keyterms[]). No real person name.
2. Define 4 raw answer strings hand-written, synthetic, each 80-140 words, in array rawTranscripts[0..3].
   - rawTranscripts[2] (third answer) MUST contain filler cluster near 07:42: include phrase "kind of" three times within a 15-second window centered at ~462000 ms. Example raw string includes "... it was kind of tricky, kind of unexpected, kind of my fault ...".
   - rawTranscripts[1] (second answer) MUST contain a run-on that will be stretched to >=1500 ms pause: include two sentences separated by explicit marker "[PAUSE]" which generator will turn into inter-word gap.
3. Helper wordToTranscriptWord(wordText:string, index:number, baseMs:number): creates TranscriptWord { text:wordText, start:baseMs + index*350, end:baseMs + index*350+250, confidence:0.92+ (index%3)*0.02, word_is_final: false } except last word word_is_final:true.
   - For pause case: before words after "[PAUSE]", add 1600 ms gap (prevWord.end + 1600 = nextWord.start) so buildEvidence will see >=1500 ms gap.
   - For 07:42 filler cluster: baseMs for that turn is 455000 (so third turn spans ~455s-475s; words landing at 462000). Compute base per turn: turn0 base 5000, turn1 base 125000, turn2 base 455000, turn3 base 530000. Total duration ~600s -> 10 min but capped to 540000 (9 min) by last word end; verify duration_ms in 480000..600000.
4. For each i in 0..3:
   a. Split rawTranscripts[i] on spaces (handle "[PAUSE]" removal, but remember gap insertion point).
   b. Build words: TranscriptWord[] via wordToTranscriptWord loop with gap insertion.
   c. Set transcript string = rawTranscripts[i] without "[PAUSE]" marker.
   d. Compute turn_order=i, formatted=true, end_of_turn=true, end_of_turn_confidence=0.92, speaker:"candidate", received_at = new Date(Date.now() - ((3-i)*60000)).toISOString() (or synthetic ISO with increasing seconds).
   e. Assemble TranscriptTurn trn = { turn_order, transcript, formatted, end_of_turn, end_of_turn_confidence, words, speaker, received_at }.
5. Verify filler cluster: run detectFillers(trn) on each turn; assert hits on turn2 include word "kind" with start in [460000,464000] and overall 3 hits of "kind" in that window; assert formatTimestamp(hit.start_ms) === "07:42" for at least one hit.
6. For each i:
   a. hits = detectFillers(turns[i])
   b. evidence = buildEvidence(turns[i], hits)
   c. detScore = scoreAnswerDeterministic(turns[i], questions[i])
   d. Collect detScores[i] = detScore (evidence already inside detScore.evidence per rubric impl).
7. Build scorecard:
   scorecard = buildScorecard({ session_id: "golden-session-01", started_at: turns[0].words[0].start (or 0), scores: detScores, turns, degraded:false })
8. Derive InterviewerAction array (5 elements):
   actions[0] = { say: questions[0].text, question: questions[0], score:null, done:false, degraded:false }
   for i=0..2: actions[i+1] = { say: questions[i+1].text, question: questions[i+1], score: detScores[i], done:false, degraded:false }
   weakest = selectWeakest(scorecard) ?? questions[0].id
   drillQuestion = questions.find(q=>q.id===weakest)!
   actions[4] = { say: drillQuestion.follow_ups[0] ?? "Can you elaborate on that answer?", question: drillQuestion, score: detScores[3], done:false, degraded:false }
9. Assemble GoldenSession { turns, actions, scorecard } and write to fixtures/mockrill/session-golden.json via writeFileSync(JSON.stringify(..., null, 2)).
10. Postcondition assertions (fail generation if not met):
   - turns.length===4 && actions.length===5
   - scorecard.per_question.length===4 && scorecard.overall computed same as buildScorecard
   - filler_top contains hit with formatTimestamp(hit.start_ms)==="07:42"
   - evidence of kind "pause" exists in some score
   - duration_ms in 480000..600000
   - transcript strings contain "kind of" at least 3 times in turn2
```

Literal constants: 8787 (port), 1500 (realtime cap ms), 1600 (pause gap ms), 350 (word spacing ms), 250 (word duration ms), bases [5000,125000,455000,530000], filler window [460000,464000], 480000..600000 duration window. No localStorage.

### A2 Mock publisher replay — `scripts/mockrill-mock-publish.ts`

```
1. Parse args: (parseArgs(argv))
   - defaults: port=8787, fixture="fixtures/mockrill/session-golden.json", fast=false, loop=false
   - flags: --fast (boolean), --port <n> (next arg parsed as int), --fixture <path>, --loop, --help (prints usage, exits 0)
   - unknown flag -> console.error usage; process.exit(2)
   - validate port 1..65535 else exit 2
2. Load fixture: readFileSync(fixturePath,"utf8") -> JSON.parse -> GoldenSession {turns,actions,scorecard}
   - validate turns.length===4 && actions.length===5 else warn and continue
   - derive traceId = randomUUID() per connection
3. Create publisher: import { createPublisher } from "src/platform/transport"; const publisher = createPublisher("sse");
4. Create HTTP server: import { createServer } from "node:http"; createServer(async (req,res))
   - URL parsing: new URL(req.url, `http://localhost:${port}`)
   - GET /events/stream:
     a. publisher.asSseStream(req,res)
     b. traceId = randomUUID();
     c. Schedule replay for this traceId:
        For stepIndex, payload in replayPlan(fixture, traceId):
          envelope = makeEnvelope(stepId, status, payload, { traceId })
          await publisher.publish({ stepId, status, payload, traceId, degraded:false })
          delay = fast ? 0 : min(1500, timeUntilNextEnvelope)
        replayPlan order (9 envelopes minimum):
        1 session-start started {session_id, role:"frontend", began_at:now ISO}
        2 mic-capture started {sample_rate:16000, muted:false}
        for i 0..3:
          transcript-final done {turn: turns[i]}
          answer-scored done {score: derived from actions[i+1]?.score ?? scorecard.per_question[i]}
          question-asked started/done {question: actions[i+1]?.question ?? nextQ, spoken: actions[i+1]?.say }
        scorecard-ready done {scorecard}
        session-end done {session_id, duration_ms: scorecard.duration_ms, reason:"complete"}
        If --loop, after done wait 2000 ms then restart for same connection
     d. req.on("close", ()=> {/* no-op */})
   - GET /events:
     a. snap = publisher.collect()
     b. res.writeHead(200, {"Content-Type":"application/json"}); res.end(JSON.stringify(snap ?? {status:"complete",trace_id:"",events:[],degraded:false}))
   - GET /health or GET / : 200 { ok:true, service:"mockrill-mock-publish", port, fixture }
   - else: 404 { error:"not_found" }
5. server.listen(port, ()=> console.log(`mockrill-mock-publish listening on http://localhost:${port} fixture=${fixturePath} ${fast?"--fast":"realtime"} ${loop?"--loop":""}`))
6. SIGINT/SIGTERM handling: server.close(); await publisher.close(); process.exit(0)
7. Error handling: server.on("error", (e)=>{ console.error(e); process.exit(1) })
```

- Timing literals: realtime cap 1500, fallback inter-step 800 ms, loop restart 2000 ms, default port 8787.
- Import literals: createPublisher("sse"), makeEnvelope, asSseStream(req,res), publisher.collect().
- Never import src/media, src/cost, src/dev etc.

### A3 Golden-cache explicit-key recording

```
For each of 6 keys, prepare a request.json (input for deriveKey) and response.json (value), then record:
- key mockrill-aai-token: provider "assemblyai", model "universal-3-pro", input = { action:"aai-token", path:"/api/aai-token" }, output = { token: "golden-aai-token-...", expires_in_seconds: 600 }
- key mockrill-session-golden: provider "mockrill", model "session", input = { action:"session-golden" }, output = GoldenSession JSON
- keys mockrill-turn-01..04: provider "assemblyai", model "claude-sonnet-4-6", input = { session_id: scorecard.session_id, asked:[...ids], last_turn: turns[i], role:"frontend" }, output = InterviewerAction JSON

Each recording command:
  npx vite-node src/resilience/scripts/record-golden.ts --provider <p> --model <m> --input <tmp-request.json> --output <tmp-response.json> --key <kebab-explicit> --source mock
Verification for each:
  node -e "import {createGoldenCache} from 'src/resilience'; const c=createGoldenCache(); c.get('mockrill-aai-token').then(v=>console.log(v? 'hit':'miss'))"
```

Consumed by wrapped calls: mockrill-aai-token by DP-AAI-STREAM api/aai-token.ts with withResilience(...,{cache_key_strategy:"explicit", cache_key_explicit:"mockrill-aai-token"}); mockrill-session-golden by same/UI; mockrill-turn-0N by DP-INTERVIEWER chatCompletion/engine/agents/callInterviewer with explicit key. Different key is invisible.

### A4 Ladder routing (implicit, documented in M44)

If RES_FORCED_DEGRADED==="1", withResilience kill switch serves golden cache entry instead of network; UI detects degraded===true via isDegradedEnvelope and renders amber "cached session" banner.

### A5 Offline build proof steps (NFR-08)

Executed by WU-DEMO-06 in order with no network (after warm npm ci cache), expecting outputs listed there; relies on publisher.collect() fallback because useEventStream will fetchEventFallback -> GET /events when SSE fails — but with mock publisher running locally SSE is local network, so transcript ticks even with external network disabled.


## §6 Configuration, environment & files

### Env vars

| var | set in | read by | missing → |
|---|---|---|---|
| `ASSEMBLYAI_API_KEY` | Vercel env (Production+Preview) + local `.env` | `api/aai-token.ts`, `api/turn.ts` only (server, never browser) | `GET /api/aai-token` returns `503` degraded `makeDegradedResult({reason:"aai_key_missing", fallback_source:"none"})`; rungs 2/4 replay golden |
| `MOCKRILL_LLM_MODEL` | optional Vercel/local `.env` | `api/turn.ts` (server) | defaults `claude-sonnet-4-6` |
| `MOCKRILL_LLM_FALLBACK_MODEL` | optional | `api/turn.ts` | defaults `qwen3.5-4b-32k-fast` |
| `RES_FORCED_DEGRADED` | set `1` only for rung-2 demo / golden replay | `src/resilience` `withResilience` kill switch (`RES_FORCED_DEGRADED=1` → every wrapped call serves its golden cache entry) | unset = live behavior (rung 1); absent is normal production |
| `PUBLIC_URL` | local `.env` after `npm run deploy` | `scripts/smoke-deploy.ts` (`deploy:verify` polls `GET $PUBLIC_URL/health`) | fallback `http://localhost:3000` and fail if no deployment |
| `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` | local `.env` never committed | `npm run deploy` | deploy fails with `missing VERCEL_TOKEN` |
| `PORT` (mock publisher) | CLI `--port` or default 8787 | `scripts/mockrill-mock-publish.ts` server.listen | default 8787 |

No secret ever written into `fixtures/mockrill/session-golden.json`, `docs/fallback-ladder.md`, `vercel.json`, `.env.example` logs. The generator uses no env. The publisher reads no secret.

### Config files

- `assembly.manifest.json` — chassis, read-only. INCLUDES `resilience, platform, ideation, context, provenance`; EXCLUDES `media, dev-tooling, assembly-advisory, data, cost, pgm, profile`. **This plan states prominently** that `scripts/mock-publish.ts` does not exist because `dev-tooling` is excluded — its `package.json` reference is dead and must be repointed (see §3).
- `config/transport.json` + `TRANSPORT` env — chassis `resolveTransport()` defaults `sse`; publisher uses `createPublisher("sse")` explicitly, so config is not required.
- `config/deploy/vercel.json` — chassis, read-only, not edited.
- `.env` — git-ignored, holds real `ASSEMBLYAI_API_KEY` locally; `.env.example` at root (owned by DP-DEPLOY) complements chassis `config/env.example`.
- `src/resilience/cache/` — default dir `.golden-cache/` or `RESILIENCE_CACHE_DIR`; `createGoldenCache()` / `deriveKey()` handle explicit keys.

### Complete file map — everything this plan creates or edits

| Path | Action | Description |
|---|---|---|
| `fixtures/mockrill/generate-golden.ts` | **CREATE** | Generator (M42-generator): imports real scoring functions + `formatTimestamp`/`makeEnvelope` types, writes `session-golden.json`; named `generateGolden()` |
| `fixtures/mockrill/session-golden.json` | **CREATE via generator** (data, M42) | Canonical fake session `{ turns, actions, scorecard }` with 4 turns, 5 actions, 07:42 filler, ≥1500 ms pause, 8–10 min |
| `scripts/mockrill-mock-publish.ts` | **CREATE** (M43) | SSE replay server: `createPublisher("sse")`, `asSseStream`, `publisher.collect()`, flags `--fast/--port/--fixture/--loop`; file header states dead `scripts/mock-publish.ts` reference verbatim |
| `package.json` | **EDIT** (2 keys) | `mock:publish` → `vite-node scripts/mockrill-mock-publish.ts` (fixes dead ref) and adds `golden:record` → `vite-node src/resilience/scripts/record-golden.ts`; no other keys touched |
| `docs/fallback-ladder.md` | **CREATE** (M44) | 4-rung operator runbook + rehearsal log table |
| `private/design_documents/design_plans/DP-DEMOPROOF.md` | **CREATE** | This plan |
| `fixtures/mockrill/session-golden.json` golden-cache entries (6) | **RECORD** via `golden:record` | Six explicit keys `mockrill-aai-token`, `mockrill-session-golden`, `mockrill-turn-01..04` written to `.golden-cache/` by WU-DEMO-04 |

No chassis file under `src/resilience/`, `src/platform/`, `src/context/`, `src/ideation/`, `src/provenance/`, `contracts/`, `assembly.manifest.json` is created/edited/deleted. No file under `src/media`, `src/cost`, `src/dev`, `src/pgm`, `src/profile` exists or is created.

## §7 Failure & degradation behavior

| # | Failure | Detection | DegradedResult reason string / HTTP | What the user sees | Ladder rung |
|---|---|---|---|---|---|
| F-DEMO-01 | No mic permission | `getUserMedia` rejects `NotAllowedError` | `DegradedResult { reason:"mic_permission_denied", fallback_source:"none" }` or envelope `mic-capture` status `error` `{sample_rate, muted:true, error}` | Live rung shows mic error; presenter switches to rung 2 (amber banner) or rung 4 (mock envelopes) | Rung 2 → 4 — plan explicitly makes this a presentation choice not failure |
| F-DEMO-02 | No network / token fetch fails | `fetch` throws within `withResilience` `api/aai-token` / `streamingClient.connect()` | `DegradedResult { reason:"aai_token_unavailable" or "aai_key_missing", fallback_source:"cache" }` when `mockrill-aai-token` present, else `...fallback_source:"none"` | `RES_FORCED_DEGRADED=1` (rung 2) shows golden session instantly; rung 4 `mock:publish` shows ticking UI on localhost with zero network | Rung 2 (cache) / Rung 4 (localhost) |
| F-DEMO-03 | No API credits / LLM gateway 429/500 | `chatCompletion` `fetch` throws, `withResilience` retries 1 then fallback | `DegradedResult { reason:"llm_gateway_unavailable" or "upstream_4xx", fallback_source:"cache" }` serving `mockrill-turn-0N` | Same golden answer/score appears; UI `degraded:true` banner | Rung 2 (cache) |
| F-DEMO-04 | `scripts/mock-publish.ts` missing (dead ref) | `npm run mock:publish` fails `Cannot find module scripts/mock-publish.ts` | No DegradedResult — startup error | Fix: repoint `mock:publish` to `vite-node scripts/mockrill-mock-publish.ts` (this plan's WU-DEMO-02) — states prominently dead reference | Rung 4 setup error |
| F-DEMO-05 | Mock publisher port 8787 taken | `server.on("error", EADDRINUSE)` | HTTP not started; log `EADDRINUSE` | Use `--port <n>` flag; run `lsof -i :8787` / change port | Rung 4 |
| F-DEMO-06 | Fixture file missing / malformed | `readFileSync` throws or `turns.length!==4` | Server warns, returns empty replay or 404 for `/events` | Fix: regenerate via `npx vite-node fixtures/mockrill/generate-golden.ts` | Rung 4 / WU-DEMO-01 |
| F-DEMO-07 | `publisher.collect()` empty (no trace yet) | `collect()` returns null | `GET /events` returns `{status:"complete",trace_id:"",events:[],degraded:false}` (not error) | `useEventStream` fetches empty snapshot; UI shows empty until first `/events/stream` connection replays | Rung 4 fallback path |
| F-DEMO-08 | Cache miss on explicit key | `GoldenCache.get("mockrill-turn-0N")` → null | `DegradedResult { reason:"cache_miss", fallback_source:"none" }` | Wrapped call returns degraded with null data; app shows amber banner but no score — reason: key typo or `cache_key_strategy:"auto"` drift; fix explicit key literal | Rung 2 |
| F-DEMO-09 | Fixture drift from scoring code (hand-typed scores) | Future `detectFillers` lexicon changes but fixture not regenerated | No runtime detection — plan PREVENTS by requiring generator imports real `detectFillers`/`buildEvidence`/`scoreAnswerDeterministic`/`buildScorecard` so fixture can never drift | If manually edited, `WU-DEMO-01` verification will fail filler `label` check | Prevention in WU-DEMO-01 |
| F-DEMO-10 | `GET /events` called without `/stream` — SSE vs snapshot | Chassis `useEventStream` auto-fallback: after one retry fails, `fetchEventFallback` calls `GET <url without /stream>` | No error — snapshot `FallbackSnapshot { events: EventEnvelope[] }` | UI populates atomically from snapshot; degraded flag set if any envelope degraded | Rung 4 fallback |

Invariant: No failure throws to UI — every outbound call is `withResilience`-wrapped elsewhere with `{ timeout_ms:15000, retries:1, fallback_chain:{order:["cache","none"]} }`; failures become `DegradedResult` and UI shows `isDegradedEnvelope` / `degradedResultOf` banner. This plan's publisher never throws on publish (validated envelope).

## §8 Public surface & import rules

### What is exported (public surface)

- `fixtures/mockrill/session-golden.json` — data file (M42), shape `{ turns, actions, scorecard }` (GoldenSession). No code barrel.
- `fixtures/mockrill/generate-golden.ts` → `generateGolden(): GoldenSession` (also CLI writes JSON). No barrel re-export.
- `scripts/mockrill-mock-publish.ts` — CLI only (`vite-node scripts/mockrill-mock-publish.ts`); no library export.
- `package.json` scripts `mock:publish` (`vite-node scripts/mockrill-mock-publish.ts`) and `golden:record` (`vite-node src/resilience/scripts/record-golden.ts`). No barrel.
- `docs/fallback-ladder.md` — markdown runbook (no JS export).

There is no `src/mockrill/*` barrel for this plan; the two code files live in `fixtures/` and `scripts/`.

### What is internal

- Internal helpers in publisher (`parseArgs`, `loadFixture`, `replayPlan`, `randomUUID` trace) and generator helper `wordToTranscriptWord` — not exported.
- `publisher.collect()` internal accumulation map `Map<traceId, EventEnvelope[]>` — not exposed except via `GET /events`.

### Import rules (binding)

1. Generator MUST import `detectFillers`, `buildEvidence`, `scoreAnswerDeterministic`, `buildScorecard`, `selectWeakest`, `FILLER_LEXICON` (if checked) from `src/mockrill/scoring` (the provider DP-SCORECARD owns them); `TranscriptTurn`, `InterviewQuestion`, `Scorecard`, `AnswerScore`, `formatTimestamp`, `makeEnvelope` from `src/mockrill/contracts`. Deep imports `from "src/mockrill/scoring/fillers"` are allowed only inside generator; consumers MUST use `src/mockrill/scoring` barrel (but for this plan the generator is the only consumer).
2. Publisher MUST import `createPublisher` from `src/platform/transport` (barrel only, never deep `.../adapters/sse`) and `makeEnvelope` (+ `MOCKRILL_STEP_IDS`/`StepPayloads` types) from `src/mockrill/contracts`. Do NOT import `withResilience` (not needed here; replay is local).
3. No file may import from `src/media` (`withStt`/`withTts`), `src/cost`, `src/dev` (`mock`/`eval`/`doctor`/`track`), `src/pgm`, `src/profile`, `src/assembly` — they are excluded and absent. Never create `scripts/mock-publish.ts` (dead ref) — create `scripts/mockrill-mock-publish.ts`.
4. `src/platform/transport` is barrel only (`import { createPublisher } from "src/platform/transport"`); chassis deep import ban is CI-blocked. `src/resilience` is barrel only (`import { createGoldenCache } from "src/resilience"` via recorder CLI, not code import).
5. `package.json` keys `mock:publish` and `golden:record` are owned ONLY by this plan; no other DP touches them. Chassis keys `dev`, `build`, `build:ui`, `preview`, `deploy`, `deploy:verify`, `demodrive`, `faqdef`, `typecheck`, `test:mockrill` are read-only.
6. Exactly six explicit golden-cache keys (`mockrill-aai-token`, `mockrill-session-golden`, `mockrill-turn-01..04`) — DP-AAI-STREAM and DP-INTERVIEWER MUST use `cache_key_strategy:"explicit"` with these literals; a cache entry under a different key is invisible (chassis `deriveKey({explicitKey})`).

## §9 Work units

### WU-DEMO-01 — the fixture generator + `fixtures/mockrill/session-golden.json` (M42)

- **Goal:** Generate the canonical fake session via real scoring code so it can never drift.
- **Depends on:** DP-CONTRACTS (M1–M14 types + `makeEnvelope`/`formatTimestamp`) and DP-SCORECARD (M30–M35 scoring functions) — must be implemented before generation; otherwise stub and verify imports fail.
- **Files touched:** `fixtures/mockrill/generate-golden.ts` (CREATE), `fixtures/mockrill/session-golden.json` (CREATE via generator), `tests/mockrill/golden.test.ts` (CREATE — optional but allowed as extra verification file under `tests/mockrill/` only)
- **Implementation steps:**
  1. Create directory `fixtures/mockrill/`.
  2. Create `fixtures/mockrill/generate-golden.ts` with imports `import { detectFillers, buildEvidence, scoreAnswerDeterministic, buildScorecard, selectWeakest } from "src/mockrill/scoring"` and `import { formatTimestamp } from "src/mockrill/contracts"` plus types `TranscriptTurn`, `InterviewQuestion`, `Scorecard`, `InterviewerAction`.
  3. Define 4 `InterviewQuestion` objects (ids `q1..q4`) and 4 raw transcript strings per A1 (include "kind of" ×3 in turn2, "[PAUSE]" in turn1).
  4. Implement `wordToTranscriptWord` helper with gap logic and bases `[5000,125000,455000,530000]`, spacings `350/250/1600` as in A1.
  5. Build 4 `TranscriptTurn` objects, run assertions for `07:42` cluster and pause, then scoring loop `detectFillers→buildEvidence→scoreAnswerDeterministic→buildScorecard→selectWeakest`, derive 5 `InterviewerAction` objects, assemble `GoldenSession`.
  6. Export `export function generateGolden(): GoldenSession` and `if (import.meta.url === ...)` CLI that writes `fixtures/mockrill/session-golden.json` via `writeFileSync(JSON.stringify(golden,null,2))` and also prints `label` of filler quote at 07:42 for manual check.
  7. Run generator: `npx vite-node fixtures/mockrill/generate-golden.ts` (or `npx tsx` equivalent) — must exit 0 and write JSON.
  8. Add postcondition asserts in generator (fail if not met) as in A1 #10.
- **Verification command (ONE runnable line — MUST import real scoring functions and real `makeEnvelope`/`formatTimestamp` and print derived value):**
  ```sh
  npx vite-node -e "import { readFileSync } from 'node:fs'; import { formatTimestamp } from 'src/mockrill/contracts'; import { detectFillers, buildEvidence } from 'src/mockrill/scoring'; const g=JSON.parse(readFileSync('fixtures/mockrill/session-golden.json','utf8')); const t=g.turns[2]; const hits=detectFillers(t); const ev=buildEvidence(t,hits); const fillerQuote=ev.find(e=>e.kind==='filler' && formatTimestamp(e.start_ms)==='07:42'); console.log('07:42 label='+ (fillerQuote?fillerQuote.label:'MISS') +' filler_total='+g.scorecard.filler_total+' weakest='+g.scorecard.weakest_question_id+' duration='+g.scorecard.duration_ms); if(!fillerQuote) throw new Error('07:42 filler missing'); if(g.turns.length!==4) throw new Error('turns!=4'); if(g.scorecard.duration_ms<480000||g.scorecard.duration_ms>600000) throw new Error('duration out of 8-10min'); const hasPause=g.scorecard.per_question.some(s=>s.evidence.some(e=>e.kind==='pause')); if(!hasPause) throw new Error('pause missing'); console.log('WU-DEMO-01 OK')"
  ```
- **Expected output (exact, including literals):**
  ```
  07:42 label=07:42 filler_total=... weakest=q... duration=... 
  WU-DEMO-01 OK
  ```
  Must contain `07:42 label=07:42` (the `label` field is `formatTimestamp(start_ms)` which for hits near 462000 is literally `07:42`; generator uses `formatTimestamp` to build `EvidenceQuote.label`), `filler_total` is integer ≥3, `weakest` is `qN`, `duration` in 480000..600000, and tail `WU-DEMO-01 OK`. If any check fails, throws and does not print `WU-DEMO-01 OK`.
- **Done-when:** `fixtures/mockrill/session-golden.json` exists, has `turns:4, actions:5, per_question:4`, contains `07:42` filler label literally true, contains `pause` evidence, duration 8–10 min, synthetic-only, and verification line prints.

### WU-DEMO-02 — `scripts/mockrill-mock-publish.ts` (M43) + repoint `mock:publish`

- **Goal:** Create the SSE replay server that replaces the dead `scripts/mock-publish.ts` reference, and fix the `mock:publish` script value.
- **Depends on:** WU-DEMO-01 (fixture exists to replay); DP-CONTRACTS (`makeEnvelope`/`MOCKRILL_STEP_IDS`); chassis `src/platform/transport` (`createPublisher`, `asSseStream`).
- **Files touched:** `scripts/mockrill-mock-publish.ts` (CREATE), `package.json` (EDIT — 1 key)
- **Implementation steps:**
  1. Read `package.json` and assert `scripts["mock:publish"]` currently equals `vite-node scripts/mock-publish.ts` (the defect — this file does not exist because `dev-tooling` excluded from `assembly.manifest.json`). Also read `assembly.manifest.json` and note `dev-tooling` in `exclude` list for comment.
  2. Create `scripts/mockrill-mock-publish.ts` with file-header comment containing verbatim: `// NOTE: scripts/mock-publish.ts referenced by the existing package.json does not exist — the dev-tooling module is excluded from assembly.manifest.json. This file replaces that dead reference; mock:publish was repointed to vite-node scripts/mockrill-mock-publish.ts.`
  3. Implement `parseArgs`, `loadFixture`, `createPublisher("sse")`, Node http `createServer`, `GET /events/stream` → `asSseStream` + `publisher.publish` replay via `makeEnvelope`, `GET /events` → `publisher.collect()` exactly per A2. Handle `--fast --port --fixture --loop --help` and unknown flag exit 2. Import `createPublisher` from `src/platform/transport` (barrel only) and `makeEnvelope` from `src/mockrill/contracts`.
  4. Edit `package.json`: set `scripts["mock:publish"] = "vite-node scripts/mockrill-mock-publish.ts"`. Do NOT touch any other key (`build`, `preview`, `dev`, `build:ui`, `deploy`, `typecheck`, `test:mockrill`, `golden:record` is added in WU-DEMO-04; if already exists leave it).
  5. Verify file parses: `npx tsc --noEmit` (or `npx vite-node --check`) does not error on new file.
  6. Smoke the publisher starts: `timeout 3 npx vite-node scripts/mockrill-mock-publish.ts --port 8788` should log `mockrill-mock-publish listening on http://localhost:8788`.
- **Verification command (ONE runnable line — proves dead reference fixed and publisher imports real chassis createPublisher + real makeEnvelope):**
  ```sh
  node -e "const pkg=require('./package.json'); if(pkg.scripts['mock:publish']!=='vite-node scripts/mockrill-mock-publish.ts') throw new Error('mock:publish not repointed: '+pkg.scripts['mock:publish']); const fs=require('fs'); const s=fs.readFileSync('scripts/mockrill-mock-publish.ts','utf8'); if(!s.includes('createPublisher(\"sse\")')||!s.includes('asSseStream')||!s.includes('makeEnvelope')||!s.includes('publisher.collect()')) throw new Error('publisher missing required imports/calls'); if(!s.includes('scripts/mock-publish.ts')||!s.includes('dev-tooling')||!s.includes('assembly.manifest.json')) throw new Error('dead-reference statement missing'); if(fs.existsSync('scripts/mock-publish.ts')) throw new Error('dead file should not exist'); console.log('WU-DEMO-02 OK mock:publish='+pkg.scripts['mock:publish'])"
  ```
- **Expected output:**
  ```
  WU-DEMO-02 OK mock:publish=vite-node scripts/mockrill-mock-publish.ts
  ```
- **Done-when:** `scripts/mockrill-mock-publish.ts` exists with 4 flag parses + SSE wiring + dead-ref comment, `package.json` `mock:publish` equals the new value, verification prints.

### WU-DEMO-03 — `--fast`, `--loop`, `/events` snapshot endpoint

- **Goal:** Add the two remaining CLI modes and the `GET /events` → `publisher.collect()` non-streaming fallback so `useEventStream` fallback works.
- **Depends on:** WU-DEMO-02 (base publisher exists).
- **Files touched:** `scripts/mockrill-mock-publish.ts` (EDIT — extend A2 replay loop and `/events` handler), `tests/mockrill/mock-publish.test.ts` (CREATE — optional but allowed)
- **Implementation steps:**
  1. In `scripts/mockrill-mock-publish.ts`, ensure `--fast` path uses `delay=0` back-to-back (no `setTimeout` per envelope); default path uses `await new Promise(r=>setTimeout(r, Math.min(1500, nextGap)))` capped at 1500.
  2. Ensure `--loop` wraps replay: `while (loop && !req.destroyed) { await replayOnce(traceId); await new Promise(r=>setTimeout(r, fast?0:2000)); }` else single replay.
  3. Ensure `GET /events` handler returns `JSON.stringify(publisher.collect())` with status 200 `Content-Type: application/json`; handle `null` → empty snapshot.
  4. Ensure `GET /events/stream` and `GET /events` are routed exactly (strip query params). Unknown `GET` → 404.
  5. Test locally: start `npx vite-node scripts/mockrill-mock-publish.ts --fast --port 8789` then `curl -s http://localhost:8789/events` after attaching one `curl -s http://localhost:8789/events/stream` in background — snapshot should contain events.
- **Verification command (ONE runnable line — tests fast vs realtime timing and /events snapshot without needing network beyond localhost):**
  ```sh
  node -e "const fs=require('fs'); const s=fs.readFileSync('scripts/mockrill-mock-publish.ts','utf8'); if(!s.includes('--fast')||!s.includes('--loop')||!s.includes('--port')||!s.includes('--fixture')) throw new Error('flags missing'); if(!s.includes('publisher.collect()')||!s.includes('/events')||!s.includes('/events/stream')) throw new Error('endpoints missing'); if(!s.includes('1500')||!s.includes('2000')) throw new Error('timing literals missing'); console.log('WU-DEMO-03 OK flags+endpoints+timings present')"
  ```
- **Expected output:**
  ```
  WU-DEMO-03 OK flags+endpoints+timings present
  ```
- **Done-when:** Flags `--fast`, `--port`, `--fixture`, `--loop` all parsed, `/events` returns `publisher.collect()`, realtime cap 1500 and loop delay 2000 are literal in code, verification prints.

### WU-DEMO-04 — golden-cache recording for six explicit keys + `golden:record` script

- **Goal:** Record six golden-cache entries via the chassis recorder so rung 2 can render with no network, and wire the `golden:record` script.
- **Depends on:** WU-DEMO-01 (fixture to use as response values); WU-DEMO-02 (`mock:publish` not required but file map).
- **Files touched:** `package.json` (EDIT — add `golden:record` if not yet), `scripts/record-golden-helper.sh` or inline Node helper (CREATE optional) that generates 6 request/response JSON temp files and invokes recorder; the cache entries themselves in `.golden-cache/` (written by CLI, not committed as source but verified)
- **Implementation steps:**
  1. Read `package.json` and set `scripts["golden:record"] = "vite-node src/resilience/scripts/record-golden.ts"` (ownership table S7). Do NOT touch other keys. State that `scripts/mock-publish.ts` dead ref was already fixed in WU-DEMO-02.
  2. For each of 6 keys, create temp request/response JSON files (can use `node -e "fs.writeFileSync(...)"` inline):
     - `mockrill-aai-token`: provider `assemblyai`, model `universal-3-pro`, key `mockrill-aai-token`, request `{"action":"aai-token","path":"/api/aai-token"}`, response `{"token":"golden-aai-token-synthetic-01","expires_in_seconds":600}`
     - `mockrill-session-golden`: provider `mockrill`, model `session`, key `mockrill-session-golden`, request `{"action":"session-golden"}`, response = full GoldenSession JSON (or `{ session: GoldenSession }`)
     - `mockrill-turn-01`: provider `assemblyai`, model `claude-sonnet-4-6`, key `mockrill-turn-01`, request `{"session_id":scorecard.session_id,"asked":["q1"],"last_turn":turns[0],"role":"frontend"}`, response = `actions[1]` (score for turn0)
     - similarly `mockrill-turn-02` (asked ["q1","q2"], last_turn turns[1], response actions[2]), `mockrill-turn-03` (asked ["q1","q2","q3"], last_turn turns[2]), `mockrill-turn-04` (asked ["q1","q2","q3","q4"], last_turn turns[3], response actions[4] drill)
  3. Run for each: `npx vite-node src/resilience/scripts/record-golden.ts --provider <p> --model <m> --input <req.json> --output <res.json> --key <kebab-explicit> --source mock` (6 invocations). Verify CLI prints `record-golden: recorded key <hash> (explicit: mockrill-...) — verify with cache.get`.
  4. Document which plan's wrapped call consumes each key: `mockrill-aai-token` → DP-AAI-STREAM `StreamingClient.connect()` token fetch `withResilience(...,{cache_key_strategy:"explicit",cache_key_explicit:"mockrill-aai-token",timeout_ms:15000,retries:1,fallback_chain:{order:["cache","none"]}})`; `mockrill-session-golden` → DP-UI / DP-AAI-STREAM session bootstrap; `mockrill-turn-01..04` → DP-INTERVIEWER `chatCompletion({...}, {model:"claude-sonnet-4-6"})` wrapped with `withResilience(...,{cache_key_strategy:"explicit",cache_key_explicit:"mockrill-turn-0N"})` (note: `cache entry under different key is invisible` — emphasize).
  5. Verify cache has all six: `npx vite-node -e "import {createGoldenCache} from 'src/resilience'; const c=createGoldenCache(); Promise.all(['mockrill-aai-token','mockrill-session-golden','mockrill-turn-01','mockrill-turn-02','mockrill-turn-03','mockrill-turn-04'].map(k=>c.has(k))).then(a=>console.log(a.every(Boolean)?'all 6 cached':'miss '+a))"`
- **Verification command (ONE runnable line):**
  ```sh
  node -e "const pkg=require('./package.json'); if(pkg.scripts['golden:record']!=='vite-node src/resilience/scripts/record-golden.ts') throw new Error('golden:record wrong'); const fs=require('fs'); const s=fs.readFileSync('scripts/mockrill-mock-publish.ts','utf8'); if(!s) throw s; console.log('WU-DEMO-04 scripts OK');" && npx vite-node -e "import {createGoldenCache} from 'src/resilience'; const c=createGoldenCache(); const keys=['mockrill-aai-token','mockrill-session-golden','mockrill-turn-01','mockrill-turn-02','mockrill-turn-03','mockrill-turn-04']; Promise.all(keys.map(k=>c.has(k))).then(r=>{ if(!r.every(Boolean)) throw new Error('cache miss '+r); console.log('WU-DEMO-04 OK all 6 explicit keys cached')})"
  ```
- **Expected output (tail must contain):**
  ```
  WU-DEMO-04 OK all 6 explicit keys cached
  ```
  And recorder CLI for each key prints `record-golden: recorded key <hash> (explicit: mockrill-...)`. If `golden:record` script value wrong, first `node -e` throws.
- **Done-when:** `package.json` `golden:record` correct, all six keys present in `GoldenCache` via explicit strategy, full command lines documented in runbook §4, verification prints.

### WU-DEMO-05 — `RES_FORCED_DEGRADED=1` end-to-end verification (rung 2)

- **Goal:** Prove that with no network (or forced degraded) the app renders the golden session with amber "cached session" banner — rung 2.
- **Depends on:** WU-DEMO-04 (cache entries exist); DP-AAI-STREAM and DP-INTERVIEWER must use `cache_key_strategy:"explicit"` with those exact keys and `fallback_chain:{order:["cache","none"]}` (their plans guarantee it — this WU only verifies outcome).
- **Files touched:** `docs/fallback-ladder.md` (EDIT — add verification note for rung 2), no code file edit (verification is env-driven)
- **Implementation steps:**
  1. Ensure six keys are cached (re-run `WU-DEMO-04` check).
  2. Start app in degraded mode: `RES_FORCED_DEGRADED=1 npm run dev` (or `RES_FORCED_DEGRADED=1 npx vite --port 5173`) — chassis `withResilience` kill switch makes every wrapped call serve golden cache entry instead of network (no `ASSEMBLYAI_API_KEY` needed).
  3. Open browser to `http://localhost:5173` (or preview) — observe: same URL, same UI, instant data: transcript of 4 turns appears without speaking, scorecard appears quoting "at 07:42 you said 'kind of' 3×", amber banner reads "cached session" (or "Degraded — cached data" per DP-UI `isDegradedEnvelope`/`degradedResultOf` rendering).
  4. Verify with curl/pw: `RES_FORCED_DEGRADED=1 node -e "import {createGoldenCache} from 'src/resilience'; ..."` plus check UI banner text via `grep -r "cached session" src/mockrill/ui`.
  5. Also test without kill switch but with no network: disable wifi and reload — same golden fallback appears if cache is populated and `fallback_chain` includes `cache`.
- **Verification command (ONE runnable line — proves RES_FORCED_DEGRADED makes degraded path render; checks cache keys exist and that the fixture's 07:42 quote is what would be shown):**
  ```sh
  RES_FORCED_DEGRADED=1 npx vite-node -e "import {createGoldenCache} from 'src/resilience'; import { readFileSync } from 'node:fs'; import { formatTimestamp } from 'src/mockrill/contracts'; const c=createGoldenCache(); const g=JSON.parse(readFileSync('fixtures/mockrill/session-golden.json','utf8')); const keys=['mockrill-aai-token','mockrill-session-golden','mockrill-turn-01','mockrill-turn-02','mockrill-turn-03','mockrill-turn-04']; const hits=await Promise.all(keys.map(k=>c.has(k))); if(!hits.every(Boolean)) throw new Error('missing cache for rung2 '+hits); const has0742=g.scorecard.per_question.some(s=>s.evidence.some(e=>e.label==='07:42')); if(!has0742) throw new Error('no 07:42 evidence in scorecard'); console.log('WU-DEMO-05 OK RES_FORCED_DEGRADED=1 serves golden: 6 keys + 07:42 evidence present; UI would show amber cached session banner')"
  ```
- **Expected output:**
  ```
  WU-DEMO-05 OK RES_FORCED_DEGRADED=1 serves golden: 6 keys + 07:42 evidence present; UI would show amber cached session banner
  ```
  If `RES_FORCED_DEGRADED` not honored, app would try network and time out in 15000 ms then fallback to cache — same outcome but this kill switch is instant.
- **Done-when:** Six keys present, `07:42` evidence present in fixture's scorecard (so banner would show), kill-switch verified to serve cache without network, verification prints.

### WU-DEMO-06 — offline build + preview + mock render (rung 4, NFR-08)

- **Goal:** Prove the app builds and renders with no network: warm-cache `npm ci` → `npm run build` → `npm run preview` → `npm run mock:publish` → open preview with `?source=stream` → transcript ticks.
- **Depends on:** WU-DEMO-01 (fixture), WU-DEMO-02/03 (mock publisher), DP-DEPLOY `build`/`preview` scripts.
- **Files touched:** `docs/fallback-ladder.md` (EDIT — add offline-proof commands), no code edit
- **Implementation steps:**
  1. `npm ci` — warm cache (no network fetch if cache warm; otherwise first run needs network — proof assumes warm cache). Expected output tail contains `added <N> packages` or `up to date` and exit 0.
  2. `npm run build` — expected Vite output contains `built in` and writes `dist/index.html` + `dist/assets/*`, exit 0. (`vite build` per DP-DEPLOY M41).
  3. `npm run preview` → starts `vite preview --port 4173` (per DP-DEPLOY). Expected log `Local: http://localhost:4173/`. Keep in background.
  4. In parallel terminal: `npm run mock:publish` → `vite-node scripts/mockrill-mock-publish.ts` → log `mockrill-mock-publish listening on http://localhost:8787`.
  5. Open `http://localhost:4173/?source=stream` (or `http://localhost:4173/?transport=sse&url=http://localhost:8787/events/stream` depending on DP-UI query handling; plan fixes to `?source=stream` as literal the UI's `useMockrillEvents({source:"stream", url:"http://localhost:8787/events/stream"})` reads). Expected: UI connects via `useEventStream` to `GET http://localhost:8787/events/stream` SSE, envelopes tick in order, `StreamingTextRenderer`/`StepStatusIndicator` shows transcript-final turns, `CitationDisplay` shows `EvidenceQuote` with `label` `07:42`, scorecard renders after `scorecard-ready` envelope.
  6. Disable external network (or just leave mock publisher running locally) and confirm transcript still ticks — proves zero external network.
  7. Verify `GET http://localhost:8787/events` returns JSON snapshot with `events.length >= 9` and `events[?].payload` contains turn with `words` and scorecard.
- **Verification command (ONE runnable line — checks build output, preview static file, and /events snapshot after starting mock publisher; assumes build already done):**
  ```sh
  node -e "const fs=require('fs'); if(!fs.existsSync('dist/index.html')) throw new Error('dist/index.html missing — run npm run build'); console.log('build OK dist/index.html exists');" && timeout 5 npx vite-node scripts/mockrill-mock-publish.ts --fast --port 18787 & sleep 2; curl -s http://localhost:18787/events | node -e "const fs=require('fs'); let s=''; process.stdin.on('data',d=>s+=d); process.stdin.on('end',()=>{ const j=JSON.parse(s||'null'); const n=j&&j.events?j.events.length:0; console.log('snapshot events='+n); });" ; pkill -f "mockrill-mock-publish.*18787" || true; echo "WU-DEMO-06 check done — expect build OK and snapshot events>=0 (or >=9 after stream)"
  ```
  (For determinism, the stable sub-check is `node -e "const fs=require('fs'); if(!fs.existsSync('dist/index.html')) throw new Error('missing'); console.log('WU-DEMO-06 OK build renders and mock:publish serves /events')"` — manual browser tick check is required for full rung-4, but this automated line proves build exists and server serves.)
- **Expected output (exact observable outputs per step listed in plan text and automation tail):**
  ```
  build OK dist/index.html exists
  mockrill-mock-publish listening on http://localhost:18787 fixture=fixtures/mockrill/session-golden.json --fast
  snapshot events=... 
  WU-DEMO-06 OK build renders and mock:publish serves /events
  ```
  Full expected outputs per step: `npm ci` → `added ... packages` or `up to date` exit 0; `npm run build` → `built in` + `dist/index.html` exists; `npm run preview` → `Local: http://localhost:4173/`; `npm run mock:publish` → `listening on http://localhost:8787`; open preview `?source=stream` → transcript ticks (manual), `GET /events` → JSON `FallbackSnapshot` with `events` array; overall offline render proven.
- **Done-when:** `dist/` built, preview serves on 4173, mock publisher listens on 8787, `/events` returns `collect()` snapshot, opening preview with `?source=stream` ticks transcript even with external network disabled (manual confirmation recorded in rehearsal log), verification tail prints.

### WU-DEMO-07 — `docs/fallback-ladder.md` (M44) with the rehearsal log table

- **Goal:** Author the operator runbook: per rung precondition, exact commands, what the judge sees, presenter sentence, rule, and weekly rehearsal log from week 2.
- **Depends on:** WU-DEMO-02..06 (so rungs 2 and 4 have been rehearsed at least once and can be logged as dated lines).
- **Files touched:** `docs/fallback-ladder.md` (CREATE)
- **Implementation steps:**
  1. Create directory `docs/` if not exists.
  2. Create `docs/fallback-ladder.md` with exact structure:
     - Title `# Fallback Ladder — Mockrill Demo`
     - Intro line: the rule `**present at the highest rung that works and never apologize downward.**`
     - Section `## The 4 Rungs` — markdown table with 5 columns: Rung | What the judge sees | Trigger/Precondition | Exact commands | Presenter sentence.
       - Rung 1 Live: Trigger `default`; Commands `npm run dev` + open deployed URL `https://...vercel.app`; Judge sees judge's own voice → live transcript → scorecard quoting their words; Sentence *"Speak and I'll score your answer live — watch the transcript, then the evidence-backed scorecard."*
       - Rung 2 Degraded live: Trigger `RES_FORCED_DEGRADED=1`; Commands `RES_FORCED_DEGRADED=1 npm run dev` (local) or flag on Vercel env; Judge sees same URL same UI, instant golden-session data, amber "cached session" banner; Sentence *"We're running on the cached golden session so you can see the scorecard shape instantly — same UI, same data contract, no network."*
       - Rung 3 Recorded capture: Trigger `network dead, laptop fine`; Commands `npx vite-node src/ideation/demodrive/cli.ts capture` (or `npm run demodrive:record`) — capture recorded in week 4; Judge sees pre-recorded DEMODRIVE capture narrated live; Sentence *"Here's the DEMODRIVE capture from week 4, running now — I'll narrate the transcript and evidence as it ticks."*
       - Rung 4 Localhost sync render: Trigger `zero network`; Commands `npm run dev` + `npm run mock:publish` (or `npm run build` + `npm run preview` + `npm run mock:publish` then open `http://localhost:4173/?source=stream`); Judge sees full UI ticking from mock envelopes, zero network; Sentence *"And here it is running entirely offline — the mock publisher is replaying golden envelopes locally via SSE."*
     - Section `## Per-Rung Detail` — 4 subsections `### Rung 1 — Live` … `### Rung 4 — Localhost sync render`, each with bullets: precondition, exact commands (copy-pasteable), what the judge sees, presenter sentence, fallback rule.
     - Section `## Rehearsal Log` — table columns `Date | Rung 2 rehearsed? | Rung 4 rehearsed? | Notes | Operator` with at least one dated entry (e.g. `2026-09-03 | yes | yes | both rungs rehearsed; rung 2 amber banner confirmed, rung 4 transcript ticked via ?source=stream | initial`); include policy line *A rung that has never been rehearsed is not a rung.* and *Rungs 2 and 4 must be rehearsed at least once per week from week 2, result recorded as dated line.*
     - Section `## Quick Commands` — copy-paste block with all commands: `npx vite-node fixtures/mockrill/generate-golden.ts`, `npm run mock:publish`, `npm run mock:publish -- --fast --port 8787 --fixture fixtures/mockrill/session-golden.json --loop`, `curl http://localhost:8787/events`, `curl http://localhost:8787/events/stream`, `RES_FORCED_DEGRADED=1 npm run dev`, `npm ci && npm run build && npm run preview`, six `golden:record` lines with `--key` values.
  3. Ensure `docs/fallback-ladder.md` contains all literal strings: `RES_FORCED_DEGRADED=1`, `mockrill-mock-publish`, `--fast`, `--port`, `--fixture`, `--loop`, `8787`, `present at the highest rung that works and never apologize downward`, `A rung that has never been rehearsed is not a rung.`
  4. Verify file has at least one rehearsal date line matching `/\d{4}-\d{2}-\d{2}/`.
- **Verification command (ONE runnable line):**
  ```sh
  node -e "const fs=require('fs'); const s=fs.readFileSync('docs/fallback-ladder.md','utf8'); if(!s.includes('RES_FORCED_DEGRADED=1')) throw new Error('rung2 trigger missing'); if(!s.includes('mockrill-mock-publish')) throw new Error('publisher missing'); if(!s.includes('--fast')||!s.includes('--loop')||!s.includes('--port')||!s.includes('--fixture')) throw new Error('flags missing'); if(!s.includes('present at the highest rung that works and never apologize downward')) throw new Error('rule missing'); if(!s.includes('A rung that has never been rehearsed is not a rung')) throw new Error('rehearsal rule missing'); if(!/Rung 1/.test(s)||!s.includes('Rung 4')) throw new Error('rungs missing'); if(!/\d{4}-\d{2}-\d{2}/.test(s)) throw new Error('rehearsal date missing'); console.log('WU-DEMO-07 OK ladder+rungs+rehearsal log present')"
  ```
- **Expected output:**
  ```
  WU-DEMO-07 OK ladder+rungs+rehearsal log present
  ```
- **Done-when:** `docs/fallback-ladder.md` exists, has 4-rung table with trigger/commands/sentence, rule line verbatim, rehearsal log with dated line, quick commands, and verification prints.

## §10 Acceptance criteria

| # | Requirement | Satisfied by | Check |
|---|---|---|---|
| R-DEMO-01 | Fixture shape + content (4 Q, 4 turns, re-drill, 07:42 filler, ≥1500 ms pause, 8–10 min, synthetic) | WU-DEMO-01 | `npx vite-node -e` from WU-DEMO-01 prints `07:42 label=07:42` + `WU-DEMO-01 OK`; `turns.length===4`, `actions.length===5`, `per_question===4`, pause evidence present |
| R-DEMO-02 | Generator runs real scoring functions (no drift) | WU-DEMO-01 | `fixtures/mockrill/generate-golden.ts` imports `detectFillers`, `buildEvidence`, `scoreAnswerDeterministic`, `buildScorecard` from `src/mockrill/scoring` and is the only writer of `session-golden.json` |
| R-DEMO-03 | Publisher starts on 8787, `createPublisher("sse")`, `asSseStream`, `makeEnvelope` replay | WU-DEMO-02 | `scripts/mockrill-mock-publish.ts` contains those literals; `node -e` WU-DEMO-02 prints `WU-DEMO-02 OK` |
| R-DEMO-04 | Dead `scripts/mock-publish.ts` statement + repoint `mock:publish` | WU-DEMO-02 | `package.json` `mock:publish` equals `vite-node scripts/mockrill-mock-publish.ts`; file header contains dead-ref statement; `scripts/mock-publish.ts` does not exist |
| R-DEMO-05 | CLI flags `--fast`, `--port`, `--fixture`, `--loop`; realtime cap 1500, fast back-to-back | WU-DEMO-03 | `node -e` WU-DEMO-03 prints `WU-DEMO-03 OK`; flags parsed, delays literal 1500/2000 |
| R-DEMO-06 | `GET /events` → `publisher.collect()` for `useEventStream` fallback | WU-DEMO-03 | Code contains `publisher.collect()` serving `/events`; fallback path tested via curl snapshot |
| R-DEMO-07 | Six explicit golden-cache keys via `record-golden.ts` with `cache_key_strategy:"explicit"` mapping | WU-DEMO-04 | `package.json` `golden:record` correct; `createGoldenCache().has` for all 6 prints `WU-DEMO-04 OK` |
| R-DEMO-08 | `package.json` scripts `mock:publish` + `golden:record` ownership respected | WU-DEMO-02, WU-DEMO-04 | Both keys equal required vite-node commands; no other plan touches them |
| R-DEMO-09 | `RES_FORCED_DEGRADED=1` renders golden with amber banner (rung 2) | WU-DEMO-05 | `RES_FORCED_DEGRADED=1 npx vite-node -e` prints `WU-DEMO-05 OK`; 07:42 evidence present |
| R-DEMO-10 | Runbook `docs/fallback-ladder.md` per rung: precondition, commands, sees, says, rule | WU-DEMO-07 | `node -e` WU-DEMO-07 prints `WU-DEMO-07 OK`; contains 4 rungs + rule verbatim |
| R-DEMO-11 | Rehearsal discipline: rungs 2 & 4 rehearsed weekly from week 2, dated line in runbook | WU-DEMO-07 | Rehearsal Log table contains at least one `\d{4}-\d{2}-\d{2}` dated line; plan text in §10 states this + §9 WU-DEMO-07 asserts |
| R-DEMO-12 | Offline build proof NFR-08: npm ci → build → preview → mock:publish → ?source=stream ticks | WU-DEMO-06 | `dist/index.html` exists, server logs contain `listening on http://localhost:8787` and `Local: http://localhost:4173/`; manual tick confirmed and logged in rehearsal table |
| R-DEMO-13 | Cross-module verification imports real `makeEnvelope` + real scoring functions and prints derived fixture value | WU-DEMO-01 | The `npx vite-node -e` line imports `formatTimestamp` from `src/mockrill/contracts` and `detectFillers`/`buildEvidence` from `src/mockrill/scoring`, prints `07:42 label=07:42` derived from generated fixture |
| R-DEMO-14 | No new vendor SDK, no second key, no localStorage core, no secret in fixture | WU-DEMO-01..07 | Code grep shows no `localStorage`, no new SDK import, `ASSEMBLYAI_API_KEY` never in fixture/logs |
| R-DEMO-15 | Four-rung ladder spine specified with exact commands and preconditions | WU-DEMO-07 | `docs/fallback-ladder.md` table has Rung 1 default, Rung 2 `RES_FORCED_DEGRADED=1`, Rung 3 network dead, Rung 4 `npm run dev + mock:publish` |

Rehearsal discipline acceptance criterion (put in §10 as required): **Rungs 2 and 4 must be rehearsed at least once per week from week 2, with the result recorded in `docs/fallback-ladder.md` as a dated line. A rung that has never been rehearsed is not a rung.**

## §11 Non-goals

- End-to-end live AssemblyAI credentials, TTS voice, or Vercel deployment — owned by DP-AAI-STREAM / DP-DEPLOY. This plan provides the fallback ladder, not the live voice path.
- DEMODRIVE week-4 recorded capture asset itself — only referenced as rung 3; generation owned by `src/ideation/demodrive` chassis + DP-SUBMIT; this plan documents its trigger and presenter sentence.
- Any `withResilience` wrapping implementation — owned by DP-AAI-STREAM (token) and DP-INTERVIEWER (LLM); this plan only records the explicit cache entries that those wrappers consume.
- Scoring algorithm design, filler lexicon tuning, rubric calibration — owned by DP-SCORECARD; this plan GENERATES via those functions but does not own or change them.
- UI component design (`StreamingTextRenderer`, `StepStatusIndicator`, `CitationDisplay`) — owned by DP-UI; this plan feeds mock envelopes into the same screens.
- Any `localStorage`-dependent offline mode (forbidden by S3).
- A second API key or vendor SDK (forbidden by S3).

## §12 Open questions

| # | Question | Safe default chosen by this plan |
|---|---|---|
| Q1 | What if DP-SCORECARD changes `FILLER_LEXICON` so "kind of" is no longer detected as filler? | Generator is required to run `detectFillers` — before writing fixture, it asserts that 07:42 filler exists; if assertion fails, generation fails visibly rather than shipping a silent lie. Plan fixes filler phrase to one that is currently in `FILLER_LEXICON` per prompt, but assertion is the safety net. |
| Q2 | Which LLM model should power golden `mockrill-turn-0N` cache? The live path may switch models. | Plan records with `claude-sonnet-4-6` (primary per S5) and uses `explicit` key strategy, so the cache is model-tagged; if model changes, re-record under same key with `--provider assemblyai --model claude-sonnet-4-6` (or new model) — the explicit key is stable. |
| Q3 | Does `assembly.manifest.json` exclusion of `dev-tooling` definitely mean `scripts/mock-publish.ts` is absent? | Plan treats "does not exist" as binding fact per prompt: `scripts/mock-publish.ts` referenced by existing `package.json` does not exist — `dev-tooling` module is excluded from `assembly.manifest.json`. Every verification asserts `!existsSync('scripts/mock-publish.ts')` and the dead-ref statement is required. |
| Q4 | Should `fixtures/mockrill/session-golden.json` be committed or git-ignored? | Committed (under `fixtures/`), because `RES_FORCED_DEGRADED` and `mock:publish` need it at build/preview time and in CI without a generation step. The generator is idempotent, so re-running it regenerates the same file deterministically (modulo `received_at` ISO which is checked loosely). |
| Q5 | What if `publisher.collect()` returns empty because no stream yet opened? | `GET /events` handler returns empty snapshot `{"status":"complete","trace_id":"","events":[],"degraded":false}` — `useEventStream` treats empty as valid; the first `GET /events/stream` connection will populate it. Documented in F-DEMO-07. |



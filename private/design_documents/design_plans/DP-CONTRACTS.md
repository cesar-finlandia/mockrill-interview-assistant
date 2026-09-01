# DP-CONTRACTS — Mockrill Shared Contracts & Event Vocabulary

## §1 Purpose & scope

### §1.1 What this plan delivers

- **Single source of truth for all Mockrill domain types and event vocabulary (M1–M15).** Every other DP imports from `src/mockrill/contracts`; nothing in this plan imports from any other Mockrill module. This is the keystone plan.
- **Nine domain types in `types.ts` (M1–M9)** — `TranscriptWord`, `TranscriptTurn`, `InterviewQuestion`, `RubricAxis`, `EvidenceQuote`, `FillerHit`, `AnswerScore`, `Scorecard`, `SessionState` — with exact field shapes, constraints, and comment requirements.
- **Event vocabulary in `steps.ts` (M10–M11) and `envelope.ts` (M12)** — frozen `MOCKRILL_STEP_IDS` tuple, `MockrillStepId` union, `StepPayloads` mapped type with explicit payload for all nine step ids, and `makeEnvelope`/`resetEnvelopeSequence` helpers that produce chassis `EventEnvelope` objects.
- **Pure formatting helper `formatTimestamp` in `time.ts` (M13)** with fully specified algorithm and worked examples.
- **Barrel `index.ts` (M14), JSON Schema pair for the engine (M15), and repo conventions** — `typecheck` / `test:mockrill` scripts and `tests/mockrill/` directory.

### §1.2 Explicitly OUT of scope, and which DP owns it instead

| Out-of-scope item | Owning DP | Reason |
|---|---|---|
| `GET /api/aai-token` handler, `createMicSource`, `createStreamingClient` (M16–M20) | DP-AAI-STREAM | Requires network, browser media, WebSocket; contracts are pure types only |
| `createSpeaker`, `createTurnController` and turn-taking state machine (M21–M23) | DP-TURNTAKING | Behavior + orchestration, not vocabulary |
| `TurnRequest`/`InterviewerAction`, tool descriptors, LLM Gateway, `/api/turn`, `callInterviewer`, question bank (M24–M29) | DP-INTERVIEWER | Engine/LLM ownership |
| Filler lexicon, `detectFillers`, `buildEvidence`, deterministic rubric, `buildScorecard`/`selectWeakest` (M30–M36) | DP-SCORECARD | Scoring logic |
| `createEventBus`, `useMockrillEvents`, `main.tsx`/`index.html` (M37–M39) | DP-UI | React/UI wiring |
| `GET /api/health`, `vercel.json` (M40–M41) | DP-DEPLOY | Deployment |
| `session-golden.json`, `mockrill-mock-publish.ts`, `fallback-ladder.md` (M42–M44) | DP-DEMOPROOF | Demo/offline replay |
| Architecture diagram, `submission.md` (M45–M46) | DP-SUBMIT | Submission artifacts |
| Any network call, `withResilience` wrapping, React component, scoring algorithm | All other DPs | This plan contains **types, constants and three pure functions — no behavior, no network, no React, no scoring logic** |

## §2 Requirements

| # | Requirement | Source | Judging axis |
|---|---|---|---|
| R-CONTRACTS-01 | Types file `src/mockrill/contracts/types.ts` defines M1 `TranscriptWord` with `{ text: string; start: number; end: number; confidence: number; word_is_final: boolean }` and comment stating timestamps are milliseconds from session start | S7 M1, S5 | Application of Technology |
| R-CONTRACTS-02 | Types file defines M2 `TranscriptTurn` with `{ turn_order: number; transcript: string; formatted: boolean; end_of_turn: boolean; end_of_turn_confidence: number; words: TranscriptWord[]; speaker: "candidate" \| "interviewer"; received_at: string }` where `received_at` is ISO-8601 | S7 M2 | Application of Technology |
| R-CONTRACTS-03 | Types file defines M3 `InterviewQuestion` with `{ id: string; text: string; competency: "behavioral"\|"technical"\|"situational"; difficulty: 1\|2\|3; follow_ups: string[]; keyterms: string[] }` | S7 M3 | Application of Technology |
| R-CONTRACTS-04 | Types file defines M4 `RubricAxis` as `"structure"\|"specificity"\|"clarity"\|"relevance"` | S7 M4 | Application of Technology |
| R-CONTRACTS-05 | Types file defines M5 `EvidenceQuote` with `{ kind: "filler"\|"quote"\|"pause"; text: string; start_ms: number; end_ms: number; label: string; note: string }` | S7 M5 | Application of Technology |
| R-CONTRACTS-06 | Types file defines M6 `FillerHit` with `{ word: string; start_ms: number; end_ms: number }` | S7 M6 | Application of Technology |
| R-CONTRACTS-07 | Types file defines M7 `AnswerScore` with `{ question_id: string; turn_order: number; axes: Record<RubricAxis, number>; overall: number; rationale: string; evidence: EvidenceQuote[]; source: "llm"\|"deterministic" }`; `axes` values 0–5 integers, `overall` = `Math.round(mean(axes)*10)/10` | S7 M7, Design decisions | Application of Technology |
| R-CONTRACTS-08 | Types file defines M8 `Scorecard` with `{ session_id: string; created_at: string; duration_ms: number; per_question: AnswerScore[]; overall: number; filler_total: number; filler_top: FillerHit[]; weakest_question_id: string\|null; degraded: boolean }`; `overall` = mean of `per_question[].overall` same rounding; empty `per_question` => `overall:0`, `weakest_question_id:null` | S7 M8 | Application of Technology |
| R-CONTRACTS-09 | Types file defines M9 `SessionState` as `"idle"\|"connecting"\|"listening"\|"thinking"\|"speaking"\|"scoring"\|"complete"\|"failed"` | S7 M9 | Application of Technology |
| R-CONTRACTS-10 | Steps file `src/mockrill/contracts/steps.ts` exports `MOCKRILL_STEP_IDS` as `readonly` tuple `as const` with exactly 9 ids in order: `session-start`, `mic-capture`, `transcript-partial`, `transcript-final`, `question-asked`, `answer-scored`, `scorecard-ready`, `drill-start`, `session-end` and derived `MockrillStepId` union | S7 M10 | Application of Technology |
| R-CONTRACTS-11 | Steps file exports `StepPayloads` mapped type with explicit payload for every one of the nine step ids per table in prompt (session-start/mic-capture/etc.) | S7 M11 | Application of Technology |
| R-CONTRACTS-12 | Envelope file `src/mockrill/contracts/envelope.ts` exports `makeEnvelope` with signature `<K extends MockrillStepId>(stepId: K, status: EventEnvelope["status"], payload: StepPayloads[K], opts?: { traceId?: string; sequence?: number; degraded?: boolean }) => EventEnvelope` that imports `EventEnvelope` as type from `src/platform/transport`, fills `timestamp` via `new Date().toISOString()`, uses module-local monotone counter for `sequence` when absent, defaults `degraded` to `false`, never throws; also exports `resetEnvelopeSequence()` test seam | S7 M12 | Application of Technology |
| R-CONTRACTS-13 | Time file `src/mockrill/contracts/time.ts` exports `formatTimestamp(ms:number)=>string` with algorithm: clamp negatives to 0, `Math.floor(ms/1000)`, minutes=`Math.floor(total/60)`, seconds=`total%60`, both zero-padded to 2 digits, joined `:`; minutes NOT capped at 59; worked examples provided | S7 M13 | Application of Technology |
| R-CONTRACTS-14 | Barrel `src/mockrill/contracts/index.ts` re-exports M1–M13 and nothing else; rule that all other Mockrill code imports from `src/mockrill/contracts` | S7 M14 | Application of Technology |
| R-CONTRACTS-15 | Engine schemas `engine/schema/input.schema.json` and `engine/schema/output.schema.json` are valid JSON Schema draft-07 with `required` and `additionalProperties:false`; input mirrors `TurnRequest` owned by DP-INTERVIEWER (fields listed), output mirrors `InterviewerAction`; plan states ownership note | S7 M15 | Application of Technology |
| R-CONTRACTS-16 | `package.json` adds scripts `typecheck` (`tsc --noEmit`) and `test:mockrill` (`vitest run tests/mockrill`) and convention `tests/mockrill/` with `.gitkeep` | Package script ownership table | Presentation |
| R-CONTRACTS-17 | No file under `src/mockrill/contracts/` imports from `src/mockrill/voice`, `src/mockrill/engine`, `src/mockrill/scoring`, `src/mockrill/ui`; only non-relative import allowed is `import type { EventEnvelope } from "src/platform/transport"` | Design decisions | Application of Technology |
| R-CONTRACTS-18 | TypeScript strict, ESM, `moduleResolution: NodeNext`, `noUncheckedIndexedAccess:true`; chassis imports via barrel only; `src/*` alias configured | S3 | Application of Technology |

## §3 Contracts OWNED by this plan

> Rule for every contract below: file path and exported name are exact. Consumers MUST import this from the owning path shown; re-defining, re-typing, stubbing or copying it is a defect.

### M1 `TranscriptWord` — `src/mockrill/contracts/types.ts`

- **File:** `src/mockrill/contracts/types.ts`
- **Export:** `export interface TranscriptWord`
- **TypeScript signature:**
  ```ts
  export interface TranscriptWord {
    text: string;
    start: number; // milliseconds from session start — see note below
    end: number;   // milliseconds from session start
    confidence: number; // 0–1
    word_is_final: boolean;
  }
  ```
- **Comment requirement:** file must contain `// start/end are milliseconds from session start, matching AssemblyAI Turn.words[].start/end — do NOT divide by 1000.` directly above the interface or field.
- **JSON shape (when serialized inside Turn):** `{ "text": string, "start": number, "end": number, "confidence": number, "word_is_final": boolean }`
- **Consumers:** DP-AAI-STREAM (streamingClient constructs it from AssemblyAI message), DP-TURNTAKING (turnController forwards it), DP-INTERVIEWER (TurnRequest.last_turn.words), DP-SCORECARD (fillers/evidence/rubric read word timings), DP-UI (render transcript with timestamps), DP-DEMOPROOF (golden fixture).
- **Import rule:** `import type { TranscriptWord } from "src/mockrill/contracts";` — Consumers MUST import this from `src/mockrill/contracts`; re-defining or stubbing it is a defect.

### M2 `TranscriptTurn` — `src/mockrill/contracts/types.ts`

- **File:** `src/mockrill/contracts/types.ts`
- **Export:** `export interface TranscriptTurn`
- **Signature:**
  ```ts
  export interface TranscriptTurn {
    turn_order: number;
    transcript: string;
    formatted: boolean;
    end_of_turn: boolean;
    end_of_turn_confidence: number;
    words: TranscriptWord[];
    speaker: "candidate" | "interviewer";
    received_at: string; // ISO-8601 UTC, e.g. new Date().toISOString()
  }
  ```
- **JSON shape:** object with all above fields; `received_at` is string ISO-8601. `formatted` maps from AssemblyAI `turn_is_formatted`.
- **Consumers:** same as M1 plus `api/turn` handler passes it as `TurnRequest.last_turn`.
- **Import rule:** Consumers MUST import this from `src/mockrill/contracts`; re-defining or stubbing it is a defect.

### M3 `InterviewQuestion` — `src/mockrill/contracts/types.ts`

- **File:** `src/mockrill/contracts/types.ts`
- **Export:** `export interface InterviewQuestion`
- **Signature:**
  ```ts
  export interface InterviewQuestion {
    id: string;
    text: string;
    competency: "behavioral" | "technical" | "situational";
    difficulty: 1 | 2 | 3;
    follow_ups: string[];
    keyterms: string[];
  }
  ```
- **JSON shape:** as above; `difficulty` is integer enum 1,2,3.
- **Consumers:** DP-INTERVIEWER (question bank, `InterviewerAction.question`, tool `SELECT_QUESTION_TOOL`), DP-TURNTAKING (speaker says question text), DP-SCORECARD (needs question id/competency), DP-UI (displays question), DP-DEMOPROOF.
- **Import rule:** Consumers MUST import this from `src/mockrill/contracts`; re-defining or stubbing it is a defect.

### M4 `RubricAxis` — `src/mockrill/contracts/types.ts`

- **File:** `src/mockrill/contracts/types.ts`
- **Export:** `export type RubricAxis = "structure" | "specificity" | "clarity" | "relevance";`
- **Consumers:** DP-SCORECARD (rubric axes), DP-INTERVIEWER (SCORE_ANSWER_TOOL schema uses same union), DP-UI (scorecard display).
- **Import rule:** Consumers MUST import this from `src/mockrill/contracts`; re-defining or stubbing it is a defect.

### M5 `EvidenceQuote` — `src/mockrill/contracts/types.ts`

- **File:** `src/mockrill/contracts/types.ts`
- **Export:** `export interface EvidenceQuote`
- **Signature:**
  ```ts
  export interface EvidenceQuote {
    kind: "filler" | "quote" | "pause";
    text: string;
    start_ms: number;
    end_ms: number;
    label: string;
    note: string;
  }
  ```
- **Field semantics:** `kind` filler=detected filler word, quote=verbatim excerpt, pause=long silence; `label` short tag (e.g. "Filler: kind of"), `note` human-readable (e.g. "said 'kind of' 3×"). `start_ms`/`end_ms` in ms from session start.
- **Consumers:** DP-SCORECARD (evidence builder), DP-INTERVIEWER (LLM may produce evidence), DP-UI (CitationDisplay).
- **Import rule:** Consumers MUST import this from `src/mockrill/contracts`; re-defining or stubbing it is a defect.

### M6 `FillerHit` — `src/mockrill/contracts/types.ts`

- **File:** `src/mockrill/contracts/types.ts`
- **Export:** `export interface FillerHit`
- **Signature:**
  ```ts
  export interface FillerHit {
    word: string;
    start_ms: number;
    end_ms: number;
  }
  ```
- **Consumers:** DP-SCORECARD (`detectFillers` returns these), DP-UI / DP-DEMOPROOF fixture.
- **Import rule:** Consumers MUST import this from `src/mockrill/contracts`; re-defining or stubbing it is a defect.

### M7 `AnswerScore` — `src/mockrill/contracts/types.ts`

- **File:** `src/mockrill/contracts/types.ts`
- **Export:** `export interface AnswerScore`
- **Signature:**
  ```ts
  export interface AnswerScore {
    question_id: string;
    turn_order: number;
    axes: Record<RubricAxis, number>; // each 0–5 integer inclusive
    overall: number; // Math.round(mean(axes)*10)/10
    rationale: string;
    evidence: EvidenceQuote[];
    source: "llm" | "deterministic";
  }
  ```
- **Constraints:** `axes` values MUST be integers 0–5 inclusive (validate in DP-SCORECARD/DP-INTERVIEWER but type documents it). `overall` is arithmetic mean of the four axes, rounded to one decimal via `Math.round(x * 10) / 10`.
- **JSON shape:** same; `axes` is object with keys `structure`,`specificity`,`clarity`,`relevance` each number.
- **Consumers:** DP-INTERVIEWER (SCORE_ANSWER_TOOL / InterviewerAction.score), DP-SCORECARD (mergeScores, buildScorecard), DP-UI, DP-DEMOPROOF.
- **Import rule:** Consumers MUST import this from `src/mockrill/contracts`; re-defining or stubbing it is a defect.

### M8 `Scorecard` — `src/mockrill/contracts/types.ts`

- **File:** `src/mockrill/contracts/types.ts`
- **Export:** `export interface Scorecard`
- **Signature:**
  ```ts
  export interface Scorecard {
    session_id: string;
    created_at: string; // ISO-8601
    duration_ms: number;
    per_question: AnswerScore[];
    overall: number; // Math.round(mean(per_question[].overall)*10)/10, 0 if empty
    filler_total: number;
    filler_top: FillerHit[];
    weakest_question_id: string | null; // null if per_question empty
    degraded: boolean;
  }
  ```
- **Constraints:** `overall` = `per_question.length===0 ? 0 : Math.round((sum(per_question[].overall)/per_question.length)*10)/10`. `weakest_question_id` = id of lowest `overall` in `per_question`, or `null` if empty (tie: first encountered).
- **Consumers:** DP-SCORECARD (buildScorecard/selectWeakest), DP-UI (scorecard screen), DP-DEMOPROOF (golden fixture), `answer-scored`/`scorecard-ready` event payloads.
- **Import rule:** Consumers MUST import this from `src/mockrill/contracts`; re-defining or stubbing it is a defect.

### M9 `SessionState` — `src/mockrill/contracts/types.ts`

- **File:** `src/mockrill/contracts/types.ts`
- **Export:** `export type SessionState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "scoring" | "complete" | "failed";`
- **Consumers:** DP-TURNTAKING (`createTurnController` state), DP-UI (status indicator).
- **Import rule:** Consumers MUST import this from `src/mockrill/contracts`; re-defining or stubbing it is a defect.

### M10 `MOCKRILL_STEP_IDS` + `MockrillStepId` — `src/mockrill/contracts/steps.ts`

- **File:** `src/mockrill/contracts/steps.ts`
- **Exports:**
  ```ts
  export const MOCKRILL_STEP_IDS = [
    "session-start",
    "mic-capture",
    "transcript-partial",
    "transcript-final",
    "question-asked",
    "answer-scored",
    "scorecard-ready",
    "drill-start",
    "session-end",
  ] as const;
  export type MockrillStepId = typeof MOCKRILL_STEP_IDS[number];
  ```
- **Constraints:** tuple is `readonly` + `as const`; order is binding; exactly these nine strings.
- **Consumers:** every DP that publishes/consumes events: DP-AAI-STREAM, DP-TURNTAKING, DP-INTERVIEWER, DP-SCORECARD, DP-UI, DP-DEMOPROOF.
- **Import rule:** Consumers MUST import this from `src/mockrill/contracts`; re-defining or stubbing it is a defect.

### M11 `StepPayloads` — `src/mockrill/contracts/steps.ts`

- **File:** `src/mockrill/contracts/steps.ts`
- **Export:** `export type StepPayloads = { ... }` (mapped type)
- **Signature:**
  ```ts
  export type StepPayloads = {
    "session-start": { session_id: string; role: string; began_at: string };
    "mic-capture": { sample_rate: number; muted: boolean; error?: string };
    "transcript-partial": { turn: TranscriptTurn };
    "transcript-final": { turn: TranscriptTurn };
    "question-asked": { question: InterviewQuestion; spoken: string };
    "answer-scored": { score: AnswerScore };
    "scorecard-ready": { scorecard: Scorecard };
    "drill-start": { question_id: string; attempt: number };
    "session-end": { session_id: string; duration_ms: number; reason: string };
  };
  ```
- **Status values per step (enforced by publisher call sites, documented here):**
  | step_id | allowed `EventEnvelope.status` |
  |---|---|
  | `session-start` | `started` |
  | `mic-capture` | `started` \| `error` |
  | `transcript-partial` | `streaming` |
  | `transcript-final` | `done` |
  | `question-asked` | `started` \| `done` |
  | `answer-scored` | `done` \| `error` |
  | `scorecard-ready` | `done` |
  | `drill-start` | `started` |
  | `session-end` | `done` \| `error` |
- **Consumers:** all event producers/consumers; `makeEnvelope` is generic over this map; DP-UI filters by step_id.
- **Import rule:** Consumers MUST import this from `src/mockrill/contracts`; re-defining or stubbing it is a defect.

### M12 `makeEnvelope` + `resetEnvelopeSequence` — `src/mockrill/contracts/envelope.ts`

- **File:** `src/mockrill/contracts/envelope.ts`
- **Exports:**
  ```ts
  import type { EventEnvelope } from "src/platform/transport";
  export function makeEnvelope<K extends MockrillStepId>(
    stepId: K,
    status: EventEnvelope["status"],
    payload: StepPayloads[K],
    opts?: { traceId?: string; sequence?: number; degraded?: boolean }
  ): EventEnvelope;
  export function resetEnvelopeSequence(): void; // test seam, internal-but-exported for tests only
  ```
- **Behavior (see §5):** imports `EventEnvelope` as type only; fills `timestamp` with `new Date().toISOString()`; uses module-local monotone counter for `sequence` when `opts.sequence` absent; defaults `degraded` to `false`; never throws.
- **JSON shape returned:** `EventEnvelope` = `{ step_id: string, status: string, payload: Record<string,unknown>, timestamp: string, sequence: number, trace_id?: string, degraded?: boolean }`
- **Consumers:** DP-TURNTAKING (emits most envelopes via bus/publisher), DP-AAI-STREAM, DP-INTERVIEWER, DP-SCORECARD, DP-UI, DP-DEMOPROOF (`mockrill-mock-publish` replays via `makeEnvelope`).
- **Import rule:** Consumers MUST import this from `src/mockrill/contracts`; re-defining or stubbing it is a defect.

### M13 `formatTimestamp` — `src/mockrill/contracts/time.ts`

- **File:** `src/mockrill/contracts/time.ts`
- **Export:** `export function formatTimestamp(ms: number): string`
- **Signature:** `(ms: number) => string` → `mm:ss` zero-padded, minutes NOT capped at 59.
- **Algorithm:** see §5.
- **Consumers:** DP-UI (renders word timestamps like "at 07:42"), DP-SCORECARD (evidence note formatting).
- **Import rule:** Consumers MUST import this from `src/mockrill/contracts`; re-defining or stubbing it is a defect.

### M14 Barrel — `src/mockrill/contracts/index.ts`

- **File:** `src/mockrill/contracts/index.ts`
- **Exports:** `export type { TranscriptWord, TranscriptTurn, InterviewQuestion, RubricAxis, EvidenceQuote, FillerHit, AnswerScore, Scorecard, SessionState } from "./types.js"; export { MOCKRILL_STEP_IDS } from "./steps.js"; export type { MockrillStepId, StepPayloads } from "./steps.js"; export { makeEnvelope, resetEnvelopeSequence } from "./envelope.js"; export { formatTimestamp } from "./time.js";`
- **Rule:** re-exports M1–M13 and **nothing else**. All other Mockrill code imports from `src/mockrill/contracts`, never from the individual files. Barrel is the only public surface.
- **Consumers:** every Mockrill module.
- **Import rule:** Consumers MUST import this from `src/mockrill/contracts`; re-defining or stubbing it is a defect.

### M15 Engine JSON Schemas — `engine/schema/input.schema.json` & `engine/schema/output.schema.json`

- **Files:** `engine/schema/input.schema.json`, `engine/schema/output.schema.json`
- **Exports:** JSON Schema draft-07 objects (see §6 for literals).
- **Input schema mirrors `TurnRequest`** (owned by DP-INTERVIEWER) — fields: `session_id: string`, `asked: string[]`, `last_turn: TranscriptTurn | null`, `role: string`. DP-INTERVIEWER's TS type MUST match this field-for-field. Output schema mirrors `InterviewerAction` — fields: `say: string`, `question: InterviewQuestion | null`, `score: AnswerScore | null`, `done: boolean`, `degraded: boolean`. Both have `required` arrays and `additionalProperties: false`.
- **Consumers:** `engine/agents/index.ts` (validates I/O via `withValidation` if used), `api/turn.ts`, chassis `lint:contracts` if present.
- **Import rule:** Consumers MUST use the JSON files as schemas; re-defining a divergent TS type is a defect.

## §4 Contracts CONSUMED by this plan

This plan is a leaf — it consumes **exactly one** chassis contract and nothing from other Mockrill plans.

| # | Import path | Export | Signature | Owning module / DP |
|---|---|---|---|---|
| C1 | `src/platform/transport` | `EventEnvelope` (type) | `type EventEnvelope = { step_id: string; status: "started"\|"streaming"\|"done"\|"error"; payload: Record<string,unknown>; timestamp: string; sequence: number; trace_id?: string; degraded?: boolean }` | `src/platform/transport` (chassis, TRN-06) |

**Rules:**
- `EventEnvelope` MUST be imported **as a type only**: `import type { EventEnvelope } from "src/platform/transport";` — this is the **only non-relative import allowed** anywhere in `src/mockrill/contracts/`.
- No other chassis import is permitted in this plan (no `withResilience`, `useEventStream`, `createPublisher`, `isDegradedEnvelope`, etc.).
- Nothing in `contracts/` may import from `src/mockrill/voice`, `src/mockrill/engine`, `src/mockrill/scoring`, or `src/mockrill/ui`.
- None of the consumed contracts may be re-implemented, re-typed, or stubbed — always import from the canonical path.

## §5 Algorithms

### A1 `formatTimestamp(ms: number): string` — `src/mockrill/contracts/time.ts`

Specified literally; no branching beyond what is listed:

```
1. If ms is NaN or not finite, treat as 0 (defensive; never throws).
2. Clamp: if ms < 0 then ms = 0.
3. totalSeconds = Math.floor(ms / 1000);
4. minutes = Math.floor(totalSeconds / 60);
5. seconds = totalSeconds % 60;
6. mm = String(minutes).padStart(2, "0");
7. ss = String(seconds).padStart(2, "0");
8. return `${mm}:${ss}`;
```

Minutes are NOT capped at 59. `padStart(2,"0")` still pads but does not truncate; `75` → `"75"`.

**Worked examples (normative):**

| input `ms` | `totalSeconds` | `minutes` | `seconds` | output |
|---|---|---|---|---|
| `0` | 0 | 0 | 0 | `"00:00"` |
| `462000` | 462 | 7 | 42 | `"07:42"` |
| `-5` | clamp→0 | 0 | 0 | `"00:00"` |
| `59999` | 59 | 0 | 59 | `"00:59"` |
| `3600000` | 3600 | 60 | 0 | `"60:00"` |
| `4504000` (75:04) | 4504 | 75 | 4 | `"75:04"` |
| `1000` | 1 | 0 | 1 | `"00:01"` |
| `61000` | 61 | 1 | 1 | `"01:01"` |

### A2 `makeEnvelope` — `src/mockrill/contracts/envelope.ts`

```ts
import type { EventEnvelope } from "src/platform/transport";
import type { MockrillStepId, StepPayloads } from "./steps.js";

let _seq = 0; // module-local monotone counter, starts at 0

export function makeEnvelope<K extends MockrillStepId>(
  stepId: K,
  status: EventEnvelope["status"],
  payload: StepPayloads[K],
  opts?: { traceId?: string; sequence?: number; degraded?: boolean }
): EventEnvelope {
  // 1. sequence = (opts?.sequence !== undefined) ? opts.sequence : _seq++
  //    (if opts.sequence is supplied, do NOT advance _seq)
  // 2. timestamp = new Date().toISOString()
  // 3. degraded = opts?.degraded ?? false
  // 4. return { step_id: stepId, status, payload: payload as Record<string,unknown>, timestamp, sequence, ...(opts?.traceId ? { trace_id: opts.traceId } : {}), degraded }
  // 5. NEVER throws — even if payload is malformed, return envelope with given payload. No validation here.
}

export function resetEnvelopeSequence(): void {
  // test seam: set _seq = 0. Exported for tests only; production code never calls it.
  _seq = 0;
}
```

Constraints: imports `EventEnvelope` **as type only**; `payload` is cast to `Record<string,unknown>` to satisfy envelope shape; `trace_id` is omitted when absent (not set to undefined); `_seq` is NOT reset between calls except via `resetEnvelopeSequence`.

### A3 `AnswerScore.overall` rounding

```
axesValues = [axes.structure, axes.specificity, axes.clarity, axes.relevance] // each 0–5 integer
mean = (sum(axesValues) / 4)
overall = Math.round(mean * 10) / 10 // one decimal
```
Example: axes `{3,4,4,5}` → mean 4.0 → `"4.0"` → `4`; `{5,5,4,5}` → mean 4.75 → `Math.round(47.5)/10` → `4.8`.

### A4 `Scorecard.overall` and `weakest_question_id`

```
if per_question.length === 0:
  overall = 0
  weakest_question_id = null
else:
  mean = sum(per_question.map(p => p.overall)) / per_question.length
  overall = Math.round(mean * 10) / 10
  weakest = per_question.reduce((min, cur) => cur.overall < min.overall ? cur : min, per_question[0])
  weakest_question_id = weakest.question_id
```

Tie rule: first encountered wins (stable reduce).

### A5 No other algorithms

This plan owns **no** network, retry, scoring, or UI algorithms. `TranscriptWord` timestamps are stored as-is; no conversion is performed in contracts.

## §6 Configuration, environment & files

### Env vars

This plan owns **no** environment variables. The single runtime secret `ASSEMBLYAI_API_KEY` is owned by DP-AAI-STREAM / DP-INTERVIEWER and read only inside `api/*.ts` server-side; contracts never read env. No `MOCKRILL_*` vars are introduced here.

### Config files

- `tsconfig.json` and `vite.config.ts` already configure `src/*` alias (`"src/*": ["./src/*"]` and `vite.resolve.alias.src`). This plan does NOT edit them. `moduleResolution: NodeNext`, `strict:true`, `noUncheckedIndexedAccess:true` are binding.
- `package.json` scripts are the only config edits this plan makes (see file map).
- `engine/schema/input.schema.json` and `engine/schema/output.schema.json` are JSON Schema draft-07 files (see literals below).

### Complete file map — everything this plan creates or edits

| Path | Action | Description |
|---|---|---|
| `src/mockrill/contracts/types.ts` | **CREATE** | M1–M9 interfaces/types |
| `src/mockrill/contracts/steps.ts` | **CREATE** | M10–M11 tuple + mapped type |
| `src/mockrill/contracts/time.ts` | **CREATE** | M13 `formatTimestamp` |
| `src/mockrill/contracts/envelope.ts` | **CREATE** | M12 `makeEnvelope` + `resetEnvelopeSequence` |
| `src/mockrill/contracts/index.ts` | **CREATE** | M14 barrel re-export |
| `engine/schema/input.schema.json` | **EDIT** (replace TODO stub) | M15 input schema mirroring `TurnRequest` |
| `engine/schema/output.schema.json` | **EDIT** (replace TODO stub) | M15 output schema mirroring `InterviewerAction` |
| `package.json` | **EDIT** (add two keys) | `typecheck` + `test:mockrill` scripts |
| `tests/mockrill/.gitkeep` | **CREATE** | empty placeholder; directory holds all future `tests/mockrill/*.test.ts` files |
| `tests/mockrill/time.test.ts` | **CREATE** | unit test for `formatTimestamp` (part of WU-03) |
| `tests/mockrill/envelope.test.ts` | **CREATE** | unit test for `makeEnvelope` (part of WU-04) |
| `private/design_documents/design_plans/DP-CONTRACTS.md` | **CREATE** | this plan |

**M15 JSON literals (normative):**

`engine/schema/input.schema.json`:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "TurnRequest",
  "type": "object",
  "required": ["session_id", "asked", "last_turn", "role"],
  "additionalProperties": false,
  "properties": {
    "session_id": { "type": "string" },
    "asked": { "type": "array", "items": { "type": "string" } },
    "last_turn": {
      "anyOf": [
        { "type": "null" },
        {
          "type": "object",
          "required": ["turn_order","transcript","formatted","end_of_turn","end_of_turn_confidence","words","speaker","received_at"],
          "additionalProperties": false,
          "properties": {
            "turn_order": { "type": "integer" },
            "transcript": { "type": "string" },
            "formatted": { "type": "boolean" },
            "end_of_turn": { "type": "boolean" },
            "end_of_turn_confidence": { "type": "number" },
            "words": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["text","start","end","confidence","word_is_final"],
                "additionalProperties": false,
                "properties": {
                  "text": { "type": "string" },
                  "start": { "type": "number" },
                  "end": { "type": "number" },
                  "confidence": { "type": "number" },
                  "word_is_final": { "type": "boolean" }
                }
              }
            },
            "speaker": { "type": "string", "enum": ["candidate","interviewer"] },
            "received_at": { "type": "string", "format": "date-time" }
          }
        }
      ]
    },
    "role": { "type": "string" }
  }
}
```

`engine/schema/output.schema.json`:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "InterviewerAction",
  "type": "object",
  "required": ["say","question","score","done","degraded"],
  "additionalProperties": false,
  "properties": {
    "say": { "type": "string" },
    "question": {
      "anyOf": [
        { "type": "null" },
        {
          "type": "object",
          "required": ["id","text","competency","difficulty","follow_ups","keyterms"],
          "additionalProperties": false,
          "properties": {
            "id": { "type": "string" },
            "text": { "type": "string" },
            "competency": { "type": "string", "enum": ["behavioral","technical","situational"] },
            "difficulty": { "type": "integer", "enum": [1,2,3] },
            "follow_ups": { "type": "array", "items": { "type": "string" } },
            "keyterms": { "type": "array", "items": { "type": "string" } }
          }
        }
      ]
    },
    "score": {
      "anyOf": [
        { "type": "null" },
        {
          "type": "object",
          "required": ["question_id","turn_order","axes","overall","rationale","evidence","source"],
          "additionalProperties": false,
          "properties": {
            "question_id": { "type": "string" },
            "turn_order": { "type": "integer" },
            "axes": {
              "type": "object",
              "required": ["structure","specificity","clarity","relevance"],
              "additionalProperties": false,
              "properties": {
                "structure": { "type": "integer", "minimum": 0, "maximum": 5 },
                "specificity": { "type": "integer", "minimum": 0, "maximum": 5 },
                "clarity": { "type": "integer", "minimum": 0, "maximum": 5 },
                "relevance": { "type": "integer", "minimum": 0, "maximum": 5 }
              }
            },
            "overall": { "type": "number" },
            "rationale": { "type": "string" },
            "evidence": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["kind","text","start_ms","end_ms","label","note"],
                "additionalProperties": false,
                "properties": {
                  "kind": { "type": "string", "enum": ["filler","quote","pause"] },
                  "text": { "type": "string" },
                  "start_ms": { "type": "number" },
                  "end_ms": { "type": "number" },
                  "label": { "type": "string" },
                  "note": { "type": "string" }
                }
              }
            },
            "source": { "type": "string", "enum": ["llm","deterministic"] }
          }
        }
      ]
    },
    "done": { "type": "boolean" },
    "degraded": { "type": "boolean" }
  }
}
```

Note: DP-INTERVIEWER owns `TurnRequest` and `InterviewerAction` TS interfaces in `src/mockrill/engine/types.ts`; they MUST match these schemas field-for-field. This note must appear as a comment at top of both JSON files (`$comment`).

## §7 Failure & degradation behavior

This plan is pure types + pure functions; there is no network, so degradation is limited to envelope/time helpers never throwing.

| Failure | Detection | DegradedResult reason string | What the user sees | Fallback-ladder rung |
|---|---|---|---|---|
| `makeEnvelope` called with malformed payload (e.g. null) | None — function never validates | N/A — no `DegradedResult` produced here; envelope is still emitted with given payload | UI may render empty/malformed step; no crash | N/A (pure function never fails) |
| `formatTimestamp` called with `NaN`, `Infinity`, non-number | Clamp to `0` (defensive code path) | N/A | `"00:00"` rendered | N/A |
| Engine schema validation fails at runtime (DP-INTERVIEWER / `withValidation`) | Schema `additionalProperties:false` rejects extra field; `withValidation` returns `DegradedResult` | `"validation_failed"` (from chassis `withValidation`) | `InterviewerAction` fallback `degraded:true` value used; UI shows degraded badge via `isDegradedEnvelope` | Rung 1–2 (secondary_provider/cache) — DP-INTERVIEWER owns the `withResilience` wrapping, not this plan |
| Missing engine schema file (`engine/schema/*.json` not found) | Build-time import fails or `lint:contracts` fails | N/A | Build fails — not a runtime degraded path | N/A |

**Invariant:** `makeEnvelope` and `formatTimestamp` **never throw** — they return a value for every input. No `DegradedResult` is produced inside contracts; degraded handling is owned by DP-INTERVIEWER (LLM), DP-AAI-STREAM (token/streaming), and DP-UI (`isDegradedEnvelope`).

## §8 Public surface & import rules

### What is exported (public surface via `src/mockrill/contracts/index.ts`)

- Types: `TranscriptWord`, `TranscriptTurn`, `InterviewQuestion`, `RubricAxis`, `EvidenceQuote`, `FillerHit`, `AnswerScore`, `Scorecard`, `SessionState`
- Constants / step vocabulary: `MOCKRILL_STEP_IDS` (value) + `MockrillStepId`, `StepPayloads` (types)
- Functions: `makeEnvelope`, `resetEnvelopeSequence`, `formatTimestamp`
- Nothing else is exported. No helper, no constant, no schema object is exported from the barrel.

### What is internal (not exported from barrel)

- Module-local `_seq` counter inside `envelope.ts` — only exposed indirectly via `resetEnvelopeSequence` test seam.
- No internal re-exports of chassis `EventEnvelope`; that type is only used internally in `envelope.ts` and re-exposed via the envelope shape.

### Import rules (binding)

1. All Mockrill code (voice, engine, scoring, ui, scripts, fixtures) MUST import contracts via the barrel: `import type { TranscriptTurn, InterviewQuestion } from "src/mockrill/contracts";` and `import { makeEnvelope, formatTimestamp, MOCKRILL_STEP_IDS } from "src/mockrill/contracts";`
2. Deep imports are a defect: `from "src/mockrill/contracts/types"`, `from "src/mockrill/contracts/steps"`, `from "src/mockrill/contracts/envelope"`, `from "src/mockrill/contracts/time"` are **forbidden** outside the `contracts/` directory itself. (`contracts/index.ts` may use relative `./types.js` etc. internally.)
3. The only non-relative import permitted inside `src/mockrill/contracts/` is `import type { EventEnvelope } from "src/platform/transport";` in `envelope.ts`. Every other file in `contracts/` uses only relative imports or no imports.
4. `resetEnvelopeSequence` is internal-but-exported for tests only — production code MUST NOT call it; only `tests/mockrill/envelope.test.ts` may.
5. Nothing in `contracts/` may import from `src/mockrill/voice`, `src/mockrill/engine`, `src/mockrill/scoring`, or `src/mockrill/ui`.

## §9 Work units

### WU-CONTRACTS-01 — create `src/mockrill/contracts/types.ts` with M1–M9

- **Goal:** Author the nine domain types with exact field shapes, constraints, and comment requirements.
- **Depends on:** none (first work unit of the leaf plan).
- **Files touched:** `src/mockrill/contracts/types.ts` (CREATE).
- **Implementation steps:**
  1. Create directory `src/mockrill/contracts/`.
  2. Create `types.ts`. Add comment header `// DP-CONTRACTS M1–M9 — shared contracts; do not import from voice/engine/scoring/ui`.
  3. Define `TranscriptWord` interface exactly as M1, with `// start/end are milliseconds from session start, matching AssemblyAI Turn.words[].start/end — do NOT divide by 1000.` comment above it.
  4. Define `TranscriptTurn`, `InterviewQuestion`, `RubricAxis`, `EvidenceQuote`, `FillerHit`, `AnswerScore`, `Scorecard`, `SessionState` exactly as in §3 M2–M9.
  5. Add `AnswerScore.axes` comment `// each 0–5 integer inclusive; overall = Math.round(mean*10)/10` and `Scorecard.overall` comment documenting empty-array rule.
  6. Ensure no imports at top of file (pure types). Export all via `export` keyword.
  7. Verify file has no import from `src/mockrill/voice|engine|scoring|ui` and no non-relative import.
- **Verification command (one runnable line):**
  ```sh
  npx tsc --noEmit && echo "WU-CONTRACTS-01 OK"
  ```
- **Expected output:**
  ```
  WU-CONTRACTS-01 OK
  ```
  (no tsc errors; if `types.ts` has a shape error, `tsc` exits non-zero and the echo does not run.)
- **Done-when:** `src/mockrill/contracts/types.ts` exists, contains all nine exports with exact signatures, passes `tsc --noEmit`.

### WU-CONTRACTS-02 — create `src/mockrill/contracts/steps.ts` with M10–M11

- **Goal:** Define frozen `MOCKRILL_STEP_IDS` tuple, `MockrillStepId` union, and `StepPayloads` mapped type.
- **Depends on:** WU-CONTRACTS-01 (needs `TranscriptTurn`, `InterviewQuestion`, `AnswerScore`, `Scorecard` types).
- **Files touched:** `src/mockrill/contracts/steps.ts` (CREATE).
- **Implementation steps:**
  1. Create `steps.ts` with imports `import type { TranscriptTurn, InterviewQuestion, AnswerScore, Scorecard } from "./types.js";` (relative, `.js` extension for NodeNext ESM).
  2. Define `export const MOCKRILL_STEP_IDS = ["session-start","mic-capture","transcript-partial","transcript-final","question-asked","answer-scored","scorecard-ready","drill-start","session-end"] as const;`
  3. Define `export type MockrillStepId = typeof MOCKRILL_STEP_IDS[number];`
  4. Define `export type StepPayloads = { ... }` with exactly the nine entries and payload shapes from §3 M11 table (copy verbatim).
  5. No other exports; no chassis import.
  6. Ensure file has no import from `src/platform` or other Mockrill modules.
- **Verification command:**
  ```sh
  npx tsc --noEmit && npx vite-node -e "import {MOCKRILL_STEP_IDS} from 'src/mockrill/contracts/steps.js'; console.log(MOCKRILL_STEP_IDS.length+':'+MOCKRILL_STEP_IDS[0]+','+MOCKRILL_STEP_IDS[8])" 
  ```
- **Expected output:**
  ```
  9:session-start,session-end
  ```
- **Done-when:** `steps.ts` compiles, vite-node prints `9:session-start,session-end`.

### WU-CONTRACTS-03 — create `src/mockrill/contracts/time.ts` with M13 + its unit test

- **Goal:** Implement `formatTimestamp` pure function and its exhaustive unit test.
- **Depends on:** none (pure function) but after WU-CONTRACTS-01 for file co-location.
- **Files touched:** `src/mockrill/contracts/time.ts` (CREATE), `tests/mockrill/time.test.ts` (CREATE).
- **Implementation steps:**
  1. Create `time.ts` with `export function formatTimestamp(ms: number): string` implementing algorithm A1 (§5) literally: clamp negatives to 0, `Math.floor(ms/1000)`, `Math.floor(total/60)`, `%60`, `padStart(2,"0")`, join `:`.
  2. Handle `NaN`/`Infinity` defensively: if `!Number.isFinite(ms)` return `"00:00"`.
  3. Ensure no imports.
  4. Create `tests/mockrill/time.test.ts`:
     ```ts
     import { describe, it, expect } from "vitest";
     import { formatTimestamp } from "src/mockrill/contracts/time.js";
     describe("formatTimestamp", () => {
       it("cases", () => {
         expect(formatTimestamp(0)).toBe("00:00");
         expect(formatTimestamp(462000)).toBe("07:42");
         expect(formatTimestamp(-5)).toBe("00:00");
         expect(formatTimestamp(59999)).toBe("00:59");
         expect(formatTimestamp(3600000)).toBe("60:00");
         expect(formatTimestamp(4504000)).toBe("75:04");
         expect(formatTimestamp(1000)).toBe("00:01");
       });
     });
     ```
  5. Run `npx tsc --noEmit` to ensure test imports resolve.
- **Verification command:**
  ```sh
  npx vitest run tests/mockrill/time.test.ts
  ```
- **Expected output (last lines):**
  ```
   ✓ tests/mockrill/time.test.ts (1 test)
  Test Files  1 passed (1)
       Tests  1 passed (1)
  ```
- **Done-when:** `time.ts` implements A1 and all worked examples pass; vitest run succeeds.

### WU-CONTRACTS-04 — create `src/mockrill/contracts/envelope.ts` with M12 + its unit test, importing the real chassis `EventEnvelope` type

- **Goal:** Implement `makeEnvelope` and `resetEnvelopeSequence` that produce valid chassis `EventEnvelope` objects, proving the chassis import resolves.
- **Depends on:** WU-CONTRACTS-02 (needs `MockrillStepId`, `StepPayloads`).
- **Files touched:** `src/mockrill/contracts/envelope.ts` (CREATE), `tests/mockrill/envelope.test.ts` (CREATE).
- **Implementation steps:**
  1. Create `envelope.ts` with `import type { EventEnvelope } from "src/platform/transport";` as the **only** non-relative import, and `import type { MockrillStepId, StepPayloads } from "./steps.js";`.
  2. Declare `let _seq = 0;` module-local.
  3. Implement `makeEnvelope` exactly per A2 (§5): resolve `sequence` (use `opts.sequence` if defined, else `_seq++`), `timestamp = new Date().toISOString()`, `degraded = opts?.degraded ?? false`, return `{ step_id: stepId, status, payload: payload as Record<string,unknown>, timestamp, sequence, ...(opts?.traceId ? { trace_id: opts.traceId } : {}), degraded }`. Never throw.
  4. Implement `export function resetEnvelopeSequence(): void { _seq = 0; }` with comment `// test seam — internal-but-exported for tests only`.
  5. Create `tests/mockrill/envelope.test.ts`:
     ```ts
     import { describe, it, expect } from "vitest";
     import { makeEnvelope, resetEnvelopeSequence } from "src/mockrill/contracts/envelope.js";
     describe("makeEnvelope", () => {
       it("fills timestamp, sequence, degraded defaults", () => {
         resetEnvelopeSequence();
         const turn = { turn_order:0, transcript:"hello", formatted:true, end_of_turn:true, end_of_turn_confidence:0.9, words:[{text:"hello",start:0,end:200,confidence:0.99,word_is_final:true}], speaker:"candidate" as const, received_at:new Date().toISOString() };
         const a = makeEnvelope("transcript-final","done",{turn});
         const b = makeEnvelope("transcript-final","done",{turn});
         expect(a.step_id).toBe("transcript-final"); expect(a.status).toBe("done"); expect(a.sequence).toBe(0); expect(b.sequence).toBe(1);
         expect(a.degraded).toBe(false); expect(typeof a.timestamp).toBe("string");
         const c = makeEnvelope("session-start","started",{session_id:"s1",role:"fe",began_at:new Date().toISOString()},{sequence:99, degraded:true, traceId:"tid"});
         expect(c.sequence).toBe(99); expect(c.degraded).toBe(true); expect(c.trace_id).toBe("tid");
       });
     });
     ```
  6. Ensure test imports `EventEnvelope` type indirectly via `makeEnvelope` return — no extra stub.
- **Verification command (MUST prove chassis import resolves — vite-node one-liner):**
  ```sh
  npx vite-node -e "import {makeEnvelope,resetEnvelopeSequence} from 'src/mockrill/contracts/envelope.js'; resetEnvelopeSequence(); const turn={turn_order:0,transcript:'hello',formatted:true,end_of_turn:true,end_of_turn_confidence:0.9,words:[{text:'hello',start:0,end:200,confidence:0.99,word_is_final:true}],speaker:'candidate',received_at:new Date().toISOString()}; const env=makeEnvelope('transcript-final','done',{turn}); console.log(env.step_id+' '+env.status+' '+env.sequence)"
  ```
- **Expected output:**
  ```
  transcript-final done 0
  ```
  (If chassis `EventEnvelope` import were broken or path wrong, vite-node would throw `Failed to resolve import "src/platform/transport"` and not print this.)
- **Done-when:** `envelope.ts` compiles, vite-node one-liner prints exactly `transcript-final done 0`, and `npx vitest run tests/mockrill/envelope.test.ts` passes.

### WU-CONTRACTS-05 — create the barrel `src/mockrill/contracts/index.ts`

- **Goal:** Single public entry point re-exporting M1–M13 and nothing else.
- **Depends on:** WU-CONTRACTS-01 through WU-CONTRACTS-04.
- **Files touched:** `src/mockrill/contracts/index.ts` (CREATE).
- **Implementation steps:**
  1. Create `index.ts` with exact content:
     ```ts
     export type { TranscriptWord, TranscriptTurn, InterviewQuestion, RubricAxis, EvidenceQuote, FillerHit, AnswerScore, Scorecard, SessionState } from "./types.js";
     export { MOCKRILL_STEP_IDS } from "./steps.js";
     export type { MockrillStepId, StepPayloads } from "./steps.js";
     export { makeEnvelope, resetEnvelopeSequence } from "./envelope.js";
     export { formatTimestamp } from "./time.js";
     ```
  2. No other exports; no `export *`.
  3. Verify no deep-import ban violation: `index.ts` itself uses relative `./` only.
- **Verification command:**
  ```sh
  npx vite-node -e "import * as c from 'src/mockrill/contracts/index.js'; console.log(Object.keys(c).sort().join(','))"
  ```
- **Expected output (keys sorted):** contains at least `MOCKRILL_STEP_IDS,formatTimestamp,makeEnvelope,resetEnvelopeSequence` (type-only exports are not runtime keys, so runtime keys are the four values). Exact:
  ```
  MOCKRILL_STEP_IDS,formatTimestamp,makeEnvelope,resetEnvelopeSequence
  ```
- **Done-when:** Barrel re-exports all value exports (M10 value + M12 + M13) and typecheck passes when consumers import from `src/mockrill/contracts`.

### WU-CONTRACTS-06 — replace the two `engine/schema/*.json` stubs (M15)

- **Goal:** Replace `TODO(ENGINE)` stubs with valid JSON Schema draft-07 mirroring `TurnRequest` / `InterviewerAction`.
- **Depends on:** WU-CONTRACTS-01 (types used as reference for schema fields).
- **Files touched:** `engine/schema/input.schema.json` (EDIT), `engine/schema/output.schema.json` (EDIT).
- **Implementation steps:**
  1. Replace `engine/schema/input.schema.json` with the literal from §6 (title `TurnRequest`, required `[session_id,asked,last_turn,role]`, `additionalProperties:false`, `last_turn` anyOf null/object with nested word schema, `speaker` enum).
  2. Replace `engine/schema/output.schema.json` with the literal from §6 (title `InterviewerAction`, required `[say,question,score,done,degraded]`, `additionalProperties:false`, nested `axes` 0–5 integers, etc.).
  3. Add `"$comment": "Owned by DP-CONTRACTS; DP-INTERVIEWER TurnRequest/InterviewerAction TS types must match this schema field-for-field."` to both files (alongside `$schema`).
  4. Validate JSON is well-formed and draft-07: `npx vite-node -e` quick check or `node -e "JSON.parse(fs.readFileSync(...))"`.
- **Verification command:**
  ```sh
  node -e "const fs=require('fs'); const a=JSON.parse(fs.readFileSync('engine/schema/input.schema.json','utf8')); const b=JSON.parse(fs.readFileSync('engine/schema/output.schema.json','utf8')); if(a.required.length!==4||a.additionalProperties!==false) throw new Error('input bad'); if(b.required.length!==5||b.additionalProperties!==false) throw new Error('output bad'); console.log('schemas ok: '+a.title+','+b.title)"
  ```
- **Expected output:**
  ```
  schemas ok: TurnRequest,InterviewerAction
  ```
- **Done-when:** Both files are valid JSON Schema draft-07, contain `required` + `additionalProperties:false`, and verification prints `schemas ok: TurnRequest,InterviewerAction`.

### WU-CONTRACTS-07 — add `typecheck` and `test:mockrill` scripts and create `tests/mockrill/.gitkeep`; verification runs both and both pass

- **Goal:** Wire repo scripts and directory convention so future plans have a place and a command to run.
- **Depends on:** WU-CONTRACTS-03, WU-CONTRACTS-04 (tests exist).
- **Files touched:** `package.json` (EDIT), `tests/mockrill/.gitkeep` (CREATE), `vitest.config.ts` (READ, no edit needed beyond confirming `tests/mockrill` inclusion — see note).
- **Implementation steps:**
  1. Read `package.json`, add to `scripts`: `"typecheck": "tsc --noEmit"` and `"test:mockrill": "vitest run tests/mockrill"`. Do not touch existing chassis scripts (`dev`, `build:ui`, `deploy`, etc.). Keep JSON valid.
  2. Create directory `tests/mockrill/` if not exists; ensure `tests/mockrill/.gitkeep` is an empty file.
  3. Ensure `tests/mockrill/time.test.ts` and `tests/mockrill/envelope.test.ts` are present from WU-03/04.
  4. If `vitest.config.ts` explicitly includes `tests` globs, verify `tests/mockrill` is not excluded; otherwise no change needed (default `vitest run tests/mockrill` works regardless of config).
  5. Run both scripts locally to confirm pass before declaring done.
- **Verification command:**
  ```sh
  npm run typecheck && npm run test:mockrill
  ```
- **Expected output (tail):**
  ```
  Test Files  2 passed (2)
       Tests  2 passed (2)
  ```
  plus `typecheck` exits 0 with no output.
- **Done-when:** `npm run typecheck` passes (exit 0), `npm run test:mockrill` passes with 2 test files / 2 tests passed, and `tests/mockrill/.gitkeep` exists.

## §10 Acceptance criteria

| # | Requirement | Satisfied by | Check |
|---|---|---|---|
| R-CONTRACTS-01 | TranscriptWord shape + ms comment | WU-CONTRACTS-01 | File contains interface + comment; tsc passes |
| R-CONTRACTS-02 | TranscriptTurn shape | WU-CONTRACTS-01 | tsc passes; turn used in StepPayloads |
| R-CONTRACTS-03 | InterviewQuestion shape | WU-CONTRACTS-01 | tsc passes |
| R-CONTRACTS-04 | RubricAxis union | WU-CONTRACTS-01 | tsc passes |
| R-CONTRACTS-05 | EvidenceQuote shape | WU-CONTRACTS-01 | tsc passes |
| R-CONTRACTS-06 | FillerHit shape | WU-CONTRACTS-01 | tsc passes |
| R-CONTRACTS-07 | AnswerScore axes 0–5 + overall rounding | WU-CONTRACTS-01 | type + comment; logic tested in DP-SCORECARD but rounding rule documented here |
| R-CONTRACTS-08 | Scorecard overall + empty-array rule | WU-CONTRACTS-01 | type + comment |
| R-CONTRACTS-09 | SessionState union | WU-CONTRACTS-01 | tsc passes |
| R-CONTRACTS-10 | MOCKRILL_STEP_IDS tuple + MockrillStepId | WU-CONTRACTS-02 | vite-node prints 9:session-start,session-end |
| R-CONTRACTS-11 | StepPayloads mapped type 9 payloads | WU-CONTRACTS-02 | tsc + makeEnvelope generic compiles |
| R-CONTRACTS-12 | makeEnvelope + resetEnvelopeSequence semantics | WU-CONTRACTS-04 | vite-node prints transcript-final done 0; vitest passes |
| R-CONTRACTS-13 | formatTimestamp algorithm + examples | WU-CONTRACTS-03 | vitest time.test passes including all worked examples |
| R-CONTRACTS-14 | Barrel re-exports M1–M13 only | WU-CONTRACTS-05 | vite-node barrel keys check |
| R-CONTRACTS-15 | Engine schemas draft-07 with required + additionalProperties:false | WU-CONTRACTS-06 | node schemas ok: TurnRequest,InterviewerAction |
| R-CONTRACTS-16 | typecheck + test:mockrill scripts + tests/mockrill/.gitkeep | WU-CONTRACTS-07 | npm run typecheck && npm run test:mockrill passes |
| R-CONTRACTS-17 | No forbidden imports in contracts/ | WU-CONTRACTS-01..05 | `grep -R "from \"src/mockrill" src/mockrill/contracts/` shows only allowed type import; manual review |
| R-CONTRACTS-18 | TS strict / NodeNext / noUncheckedIndexedAccess | WU-CONTRACTS-07 | typecheck passes under repo tsconfig |

## §11 Non-goals

- No network code: token minting (`GET /api/aai-token`), WebSocket streaming, LLM Gateway calls, Vercel deployment — owned by DP-AAI-STREAM, DP-INTERVIEWER, DP-DEPLOY.
- No React/UI: `MockrillEventBus`, `useMockrillEvents`, `StreamingTextRenderer` usage, theming — owned by DP-UI.
- No scoring logic: filler lexicon, evidence building, deterministic rubric, scorecard aggregation — owned by DP-SCORECARD.
- No turn-taking behavior: mic capture, barge-in, speaking state machine — owned by DP-TURNTAKING / DP-AAI-STREAM.
- No question-bank data or prompt templates — owned by DP-INTERVIEWER.
- No fallback ladder documentation or mock publisher — owned by DP-DEMOPROOF.
- No package.json keys beyond `typecheck` and `test:mockrill`; no new dependencies, no env vars, no vendor SDK.

## §12 Open questions

| # | Question the blueprint did not settle | Safe default chosen in this plan | Impact if changed |
|---|---|---|---|
| Q1 | Exact `TurnRequest` / `InterviewerAction` evolution — DP-INTERVIEWER may add fields (e.g. `role` enum vs free string) | Input `role` is free `string` (not enum) to allow any role without schema bump; output `say` is always present even when `question` is null | Adding stricter enum later is additive; widening from enum to string would be breaking — free string is safer for contracts |
| Q2 | Whether `TranscriptTurn.received_at` should be required in schema vs optional | Required `string` `date-time` — every turn is timestamped at receipt; null `last_turn` covers absence | Making it optional later would relax schema (non-breaking) |
| Q3 | Chassis `EventEnvelope.payload` is `Record<string,unknown>` — StepPayloads are strongly typed; runtime enforcement via `withValidation` or plain cast? | This plan casts `StepPayloads[K]` to `Record<string,unknown>` inside `makeEnvelope` and does **not** validate; validation (if any) is owned by DP-INTERVIEWER via `withValidation` and engine schemas | Adding validation later does not change contracts shape |
| Q4 | `formatTimestamp` handling of `NaN`/`Infinity` | Treat as `0` → `"00:00"`, never throw — defensive, matches clamp-negatives spirit | Alternative would be to throw, which would break pure-function never-throws guarantee |
| Q5 | `resetEnvelopeSequence` visibility | Exported but documented as test-only; production code never calls it | If later needed for session reset, could be reused without breaking |
| Q6 | `SessionState` future states (e.g. `drilling`) | Not added; eight states enumerated are exhaustive for V1 | Adding a state is additive (union widening) but requires turnController update |
| Q7 | Engine schema `$schema` URL (`http://json-schema.org/draft-07/schema#` vs `https`) | Use `http://json-schema.org/draft-07/schema#` (canonical draft-07 URI) | Either URI is accepted by validators; `http` is historical canonical |

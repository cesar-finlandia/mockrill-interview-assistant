# DP-TURNTAKING — Turn-Taking, Barge-In & Voice Output

## §1 Purpose & scope

### §1.1 What this plan delivers

- **Browser TTS speaker `src/mockrill/voice/speak.ts` → `createSpeaker()` (M21)** — wraps `window.speechSynthesis` with no vendor SDK, async voice selection (Google → en- → first), 1500 ms `voiceschanged` wait, never-reject `speak()`/`cancel()`, fixed `rate:1.05/pitch:1.0/volume:1.0`, and `available===false` text-fallback contract.
- **Turn-taking state machine `src/mockrill/voice/turnController.ts` → `createTurnController()` (M22) + `TurnControllerDeps` (M23)** — explicit `SessionState` table (`idle`→`connecting`→`speaking`→`listening`→`thinking`→`speaking`→`scoring`→`complete`/`failed`), literal constants `BARGE_IN_MIN_WORDS=3, MAX_QUESTIONS=4, MAX_SESSION_MS=900000, THINKING_TIMEOUT_MS=12000, BARGE_IN_PEAK=0.15`, mute discipline, dual barge-in triggers, `nextAction` wiring, `drill()` re-entry without socket reconnect, and `latency_ms` instrumentation for NFR-06.
- **Mute discipline + barge-in policy** — mic muted for entire `speaking` duration so synthesized voice is never transcribed; barge-in fires on partial turn ≥3 words *or* 3 consecutive PCM chunks with peak >0.15 while `speaking`; amplitude computation spelled as numbered steps.
- **`drill(questionId)` in-session re-drill** — emits `drill-start` with attempt count, speaks weakest-axis framing line, reuses open WebSocket (`speaking`→`listening` without reconnect), re-scores via same `nextAction` path, replaces prior `AnswerScore` for that question.
- **`engine/voice/policy.md` (replaces `engine/voice/policy.todo.md`)** — prose policy for judges/Q&A: turn-end detection, barge-in rule, mute discipline, latency budget, and 15-min hard stop.
- **Latency measurement & degradation contract** — `performance.now()` captured at `onFinal` and at `speak()` start, delta logged as `latency_ms` in `question-asked` envelope payload; `NFR-02` never-throw guarantee; 12 s thinking timeout bridge line "Let me follow up on that." with `degraded:true` continuation.

### §1.2 Explicitly OUT of scope, and which DP owns it instead

| Out-of-scope item | Owning DP | Reason |
|---|---|---|
| Shared contracts M1–M15 (`TranscriptWord`, `TranscriptTurn`, `InterviewQuestion`, `RubricAxis`, `EvidenceQuote`, `FillerHit`, `AnswerScore`, `Scorecard`, `SessionState`, `MOCKRILL_STEP_IDS`, `StepPayloads`, `makeEnvelope`, `formatTimestamp`, engine schemas) | DP-CONTRACTS | Pure types/vocabulary; this plan consumes `SessionState`, `TranscriptTurn`, `InterviewQuestion`, `AnswerScore` but never redefines them |
| `GET /api/aai-token`, `createMicSource`, `createStreamingClient`/`StreamingClientOptions`, `buildStreamingUrl`/`mapTurnToTranscriptTurn` (M16–M19) | DP-AAI-STREAM | Mic + WebSocket primitives; this plan consumes them as injected deps in `TurnControllerDeps` |
| Barrel `src/mockrill/voice/index.ts` (M20) | DP-AAI-STREAM | Barrel re-exports M17–M19 and forwards M21–M22; this plan provides the forwarded files but does not own the barrel |
| `TurnRequest`/`InterviewerAction`, tool descriptors, `chatCompletion`, `POST /api/turn`, `callInterviewer`, question bank (M24–M29) | DP-INTERVIEWER | LLM orchestration; this plan calls `nextAction: (TurnRequest)=>Promise<InterviewerAction>` as opaque injection |
| Filler lexicon, `detectFillers`, `buildEvidence`, deterministic rubric, `buildScorecard`/`selectWeakest` (M30–M35) | DP-SCORECARD | Scoring logic; this plan only transitions to `scoring` and emits `scorecard-ready` |
| `createEventBus`, `useMockrillEvents`, `main.tsx`/`index.html` (M37–M39) | DP-UI | React wiring; this plan emits `EventEnvelope`s via injected `MockrillEventBus` |
| `GET /api/health`, `vercel.json` (M40–M41) | DP-DEPLOY | Deployment |
| Golden fixture, `mockrill-mock-publish.ts`, `fallback-ladder.md` (M42–M44) | DP-DEMOPROOF | Demo/offline replay |
| Architecture diagram, `submission.md` (M45–M46) | DP-SUBMIT | Submission artifacts |

## §2 Requirements

| # | Requirement | Source | Judging axis |
|---|---|---|---|
| R-TURN-01 | `createSpeaker()` (M21) uses only `window.speechSynthesis`; no TTS vendor SDK, no second API key; exposes `available`, `speaking`, `speak(text)`, `cancel()` per signature in §3 | M21, FR-04 | Application of Technology |
| R-TURN-02 | `available` is exactly `typeof window !== "undefined" && "speechSynthesis" in window`; when `false`, `speak()` resolves immediately (never rejects) and caller must render text on screen instead | M21(1,6) | Application of Technology |
| R-TURN-03 | Voice selection prefers first voice with `lang` startsWith `en-` and `name` includes `Google`, else any `en-` voice, else `voices[0]`; voices may load async — wait on `voiceschanged` event with 1500 ms timeout before falling back | M21(2) | Application of Technology |
| R-TURN-04 | `speak(text)` resolves on utterance `end` event and also resolves (never rejects) on `error` event and on 30 s watchdog timeout; `cancel()` calls `speechSynthesis.cancel()` and resolves any pending promise | M21(3,4) | Application of Technology |
| R-TURN-05 | Fixed synthesis params `rate:1.05`, `pitch:1.0`, `volume:1.0` with justification "slightly brisk, like a real screener" | M21(5) | Presentation |
| R-TURN-06 | `createTurnController(deps)` (M22) implements explicit state machine over `SessionState` (M9) with transition table in §5 (11 rows including `any→complete` via `stop()` and `any→failed` degraded) | M22/M23, S7 table | Application of Technology |
| R-TURN-07 | Literal constants: `BARGE_IN_MIN_WORDS=3`, `MAX_QUESTIONS=4`, `MAX_SESSION_MS=900000` (15 min hard stop), `THINKING_TIMEOUT_MS=12000` (bridge line "Let me follow up on that." then continue degraded) | M22/M23, spec | Application of Technology |
| R-TURN-08 | Mute discipline: mic is muted for entire `speaking` duration via `mic.setMuted(true/false)` so synthesized voice is never sent to AssemblyAI; `speaking→listening` unmutes; `listening→thinking` mutes; barge-in also unmutes | FR-04, mute discipline | Application of Technology |
| R-TURN-09 | Barge-in trigger 1: partial turn arrives while `speaking` with `words.length ≥ BARGE_IN_MIN_WORDS` (≥3) → `speaker.cancel()` + `mic.setMuted(false)` + transition to `listening` | FR-04, M22 row | Application of Technology |
| R-TURN-10 | Barge-in trigger 2: while `speaking`, 3 consecutive mic PCM chunks whose peak amplitude > `BARGE_IN_PEAK=0.15` → same cancel+unmute+listening transition; amplitude = max abs Int16 / 0x7FFF per chunk (int16) or per normalized Float; steps numbered in §5 | FR-04, mute discipline | Application of Technology |
| R-TURN-11 | `onFinal` turn while `listening` → `thinking`: `mic.setMuted(true)`, emit `transcript-final` (done), call `deps.nextAction(TurnRequest)` exactly once per final turn (≤1 LLM call/turn) | M22 | Application of Technology |
| R-TURN-12 | `thinking→speaking` when action has `question` not null: emit `question-asked` with `latency_ms`, call `speaker.speak(action.say)`; `thinking→scoring` when `action.done===true`; `scoring→complete` builds scorecard, emits `scorecard-ready`, calls `client.terminate()` | M22 | Application of Technology |
| R-TURN-13 | `drill(questionId)` (FR-09): emits `drill-start` with `attempt = previous attempts+1`, speaks framing line derived from question text + weakest axis, transitions `speaking→listening` **without reconnecting socket** (socket stays open), re-scores via same path, replaces prior `AnswerScore` for that question in session state | FR-09, M23 | Originality |
| R-TURN-14 | Latency NFR-06: `end_of_turn` (`onFinal`) → interviewer starts speaking ≤2.0 s p50; measured via `performance.now()` at `onFinal` and at `speak()` start, delta logged as `latency_ms:number` in `question-asked` envelope payload; demonstrable on stage | NFR-06 | Application of Technology |
| R-TURN-15 | Nothing throws to UI (NFR-02): every async boundary (`speak`, `nextAction`, `client.connect/terminate`, `mic` calls) is try/catch wrapped; failures emit degraded envelopes (`session-end` error with `degraded:true`) and move to `failed`/`complete` rather than throwing | NFR-02 | Application of Technology |
| R-TURN-16 | `MAX_SESSION_MS=900000` enforced via `setTimeout` from `start()` that forces `stop()`/`failed` and emits `session-end` with reason `max_session_exceeded` if exceeded | M22, NFR-06 | Application of Technology |
| R-TURN-17 | `engine/voice/policy.md` replaces stub `engine/voice/policy.todo.md` and documents in prose: turn-end detection, barge-in rule (both triggers), mute discipline, latency budget (NFR-06 measurement), hard stop, and degraded behavior | policy.md | Presentation |

## §3 Contracts OWNED by this plan

> Rule for every contract below: file path and exported name are exact. Consumers MUST import this from the owning path shown; re-defining, re-typing, stubbing or copying it is a defect.

### M21 `createSpeaker` — `src/mockrill/voice/speak.ts`

- **File:** `src/mockrill/voice/speak.ts`
- **Export:** `export function createSpeaker(): Speaker`
- **Supporting types (owned, same file):**
  ```ts
  export type Speaker = {
    speak(text: string): Promise<void>;
    cancel(): void;
    readonly speaking: boolean;
    readonly available: boolean;
  };
  ```
- **TypeScript signature (normative):**
  ```ts
  // src/mockrill/voice/speak.ts
  export function createSpeaker(): {
    speak(text: string): Promise<void>;
    cancel(): void;
    readonly speaking: boolean;
    readonly available: boolean;
  };
  ```
- **Behavior contract (summary — full algorithm in §5 A1):**
  - `available` is literal `typeof window !== "undefined" && "speechSynthesis" in window` computed once at creation.
  - Voice selection order: first voice where `lang.startsWith("en-") && name.includes("Google")`, else first where `lang.startsWith("en-")`, else `voices[0]`; voices may be empty initially → wait on `voiceschanged` event with 1500 ms timeout.
  - `speak(text)` creates `SpeechSynthesisUtterance` with `rate:1.05, pitch:1.0, volume:1.0`; resolves on `end`, also resolves (never rejects) on `error` and on 30 s watchdog timeout; when `available===false` resolves immediately (caller renders text on screen).
  - `cancel()` calls `speechSynthesis.cancel()` and resolves any pending `speak` promise.
- **Input/Output JSON shape:** not network — browser API only. `speak` takes `string`, returns `Promise<void>` that never rejects. `available` boolean, `speaking` boolean (true while utterance is active).
- **Consumers:** DP-TURNTAKING `createTurnController` (via `TurnControllerDeps.speaker`), DP-AAI-STREAM barrel `src/mockrill/voice/index.ts` (forwards this export), DP-UI (reads `speaking`/`available` for status), tests `tests/mockrill/voice/speak.test.ts`.
- **Import rule:** Consumers MUST import this from `src/mockrill/voice/speak.ts` or barrel `src/mockrill/voice`; re-defining or stubbing it is a defect.

### M22 `createTurnController` — `src/mockrill/voice/turnController.ts`

- **File:** `src/mockrill/voice/turnController.ts`
- **Export:** `export function createTurnController(deps: TurnControllerDeps): TurnController`
- **Supporting types (owned, same file — M22/M23):**
  ```ts
  export type TurnControllerDeps = {
    mic: {
      stream?: MediaStream;
      onChunk(cb: (pcm: Int16Array) => void): void;
      setMuted(muted: boolean): void;
      stop(): void;
    };
    client: import("src/mockrill/voice/streamingClient").StreamingClient;
    speaker: import("./speak.js").Speaker;
    bus: import("src/mockrill/ui/eventBus").MockrillEventBus;
    nextAction: (input: import("src/mockrill/engine/types").TurnRequest) => Promise<import("src/mockrill/engine/types").InterviewerAction>;
    sessionId?: string;
    role?: string;
    startedAt?: number; // performance.now() or Date.now() base for MAX_SESSION_MS
  };
  export type TurnController = {
    start(): Promise<void>;
    stop(): Promise<void>;
    drill(questionId: string): Promise<void>;
    readonly state: import("src/mockrill/contracts").SessionState;
    on(cb: (s: import("src/mockrill/contracts").SessionState) => void): () => void;
  };
  // Literal constants owned and exported for tests/docs:
  export const BARGE_IN_MIN_WORDS: 3;
  export const MAX_QUESTIONS: 4;
  export const MAX_SESSION_MS: 900000;
  export const THINKING_TIMEOUT_MS: 12000;
  export const BARGE_IN_PEAK: 0.15;
  ```
  Real file exports the constants as `export const BARGE_IN_MIN_WORDS = 3 as const;` etc.
- **Signature details:**
  - `start()` is idempotent only from `idle`; calling again in `connecting`/`speaking`/`listening`/`thinking`/`scoring` is no-op (returns resolved promise, does not throw).
  - `stop()` callable from any state → transitions to `complete`, does cleanup.
  - `drill(questionId)` only valid from `complete` or `scoring`/`listening` after scorecard exists; otherwise resolves immediately (never throws). Must NOT reconnect socket.
  - `state` is getter returning current `SessionState` (M9 union).
  - `on(cb)` subscribes to state changes, returns unsubscribe `() => void`; immediately invokes `cb` with current state once? No — only on transitions (specify: no initial call).
- **State machine contract:** 11-row transition table in §5 A2 is normative; side effects per row include `bus.emit(makeEnvelope(...))`, `mic.setMuted`, `speaker.speak/cancel`, `client.updateConfiguration/terminate`, `performance.now()` latency capture.
- **Consumers:** DP-UI (`useMockrillEvents` reads bus, components read `state`), `src/mockrill/voice/index.ts` barrel (forwards), tests (`tests/mockrill/voice/turnController.test.ts`, `tests/mockrill/voice/barge-in.test.ts`), DP-DEMOPROOF mock publisher not consumer.
- **Import rule:** Consumers MUST import this from `src/mockrill/voice/turnController.ts` or barrel `src/mockrill/voice`; re-defining or stubbing it is a defect. DP-TURNTAKING owns this file; DP-AAI-STREAM barrel only forwards it.

### M23 `TurnControllerDeps` — `src/mockrill/voice/turnController.ts`

- **File:** `src/mockrill/voice/turnController.ts` (same file as M22)
- **Export:** `export type TurnControllerDeps` (see shape above)
- **Field semantics:**
  - `mic`: `MicSource`-compatible object with `onChunk`, `setMuted`, `stop`; created by `createMicSource` (DP-AAI-STREAM M17) but type is structural to avoid circular import — plan mandates `TurnControllerDeps.mic` is typed inline, not imported from `mic.ts`, to keep dependency injection pure/testable.
  - `client`: `StreamingClient` (M18) from `src/mockrill/voice/streamingClient.ts` — real type imported for contract proof (verification imports real type).
  - `speaker`: `Speaker` from `./speak.js` (M21).
  - `bus`: `MockrillEventBus` from `src/mockrill/ui/eventBus.ts` (M37) — used to `bus.emit(makeEnvelope(...))`.
  - `nextAction`: `(TurnRequest) => Promise<InterviewerAction>` — LLM orchestration injection; in prod wired to `fetch("/api/turn", {method:"POST", body:JSON.stringify(TurnRequest)})` via `withResilience` but in tests is a fake.
  - `sessionId`, `role`, `startedAt` optional conveniences for envelope traceId and hard-stop timer.
- **Import rule:** Consumers constructing the controller MUST import the type from `src/mockrill/voice/turnController.ts`; re-defining or stubbing it is a defect.

### `engine/voice/policy.md` — replaces `engine/voice/policy.todo.md`

- **File:** `engine/voice/policy.md` (CREATE, replaces stub `engine/voice/policy.todo.md` which is DELETED)
- **Export:** Markdown prose (no TS export); owned by DP-TURNTAKING.
- **Required sections (normative headings):**
  1. `## Turn End Detection` — AssemblyAI `end_of_turn` + `turn_is_formatted` + `end_of_turn_confidence` 0.45 threshold; formatted final routed to `onFinal` → `thinking`.
  2. `## Barge-In Rule` — both triggers: word count ≥3 on partial while speaking, and 3 consecutive PCM peaks >0.15.
  3. `## Mute Discipline` — mic muted entire `speaking`, echo-cancellation note, `setMuted` calls per state.
  4. `## Latency Budget` — NFR-06 2.0 s p50, measured `performance.now()` delta into `question-asked` `latency_ms`.
  5. `## Hard Stop & Degradation` — `MAX_SESSION_MS` 900000, `THINKING_TIMEOUT_MS` 12000 bridge line, degraded continuation.
  6. `## Drill` — same-session re-drill without reconnect.
- **Consumers:** Judges, Q&A sheet, DP-UI docs, DP-SUBMIT pitch; no code consumer.
- **Import rule:** Not imported; file is documentation. Deleting the `.todo.md` stub is required.

## §4 Contracts CONSUMED by this plan

| # | Import path | Export | Signature / shape | Owning module / DP |
|---|---|---|---|---|
| C1 | `src/mockrill/contracts` | `SessionState` (type) | `"idle"\|"connecting"\|"listening"\|"thinking"\|"speaking"\|"scoring"\|"complete"\|"failed"` (M9) | DP-CONTRACTS |
| C2 | `src/mockrill/contracts` | `TranscriptTurn`, `TranscriptWord` (types) | M2/M1 — `turn_order`, `transcript`, `formatted`, `end_of_turn`, `words`, `speaker`, `received_at` | DP-CONTRACTS |
| C3 | `src/mockrill/contracts` | `InterviewQuestion`, `AnswerScore`, `Scorecard` (types) | M3/M7/M8 — used in `TurnRequest`/`InterviewerAction` and `drill` replacement | DP-CONTRACTS |
| C4 | `src/mockrill/contracts` | `MOCKRILL_STEP_IDS`, `MockrillStepId`, `StepPayloads` (values+types) | M10/M11 — 9 step ids, mapped payloads | DP-CONTRACTS |
| C5 | `src/mockrill/contracts` | `makeEnvelope` | `<K extends MockrillStepId>(stepId:K, status:EventEnvelope["status"], payload:StepPayloads[K], opts?)=>EventEnvelope` (M12) | DP-CONTRACTS |
| C6 | `src/mockrill/voice/streamingClient.ts` | `createStreamingClient`, `StreamingClient`, `StreamingClientOptions` (values+types) | M18/M19 — `connect():Promise<void\|DegradedResult>`, `sendAudio`, `updateConfiguration`, `forceEndpoint`, `terminate`, `state:"closed"\|"connecting"\|"open"` | DP-AAI-STREAM |
| C7 | `src/mockrill/voice/mic.ts` | `createMicSource`, `MicSource` (value+type) | M17 — `(opts?)=>Promise<{stream, onChunk, setMuted, stop}>` | DP-AAI-STREAM |
| C8 | `src/mockrill/engine/types.ts` | `TurnRequest`, `InterviewerAction` (types) | M24 — `TurnRequest={session_id,asked,last_turn,role}`, `InterviewerAction={say,question,score,done,degraded}` | DP-INTERVIEWER |
| C9 | `src/mockrill/ui/eventBus.ts` | `createEventBus`, `MockrillEventBus` (value+type) | M37 — `{emit(env), subscribe(cb), snapshot(), reset()}` | DP-UI |
| C10 | `src/platform/transport` | `EventEnvelope` (type) | `{step_id,status,payload,timestamp,sequence,trace_id?,degraded?}` | Chassis `src/platform/transport` |
| C11 | `src/resilience` | `withResilience`, `isDegradedResult`, `makeDegradedResult` (values) | Chassis — timeout/resilience helpers (used only for `nextAction` wiring if needed) | Chassis `src/resilience` |

**Rules:**
- All `src/mockrill/contracts` imports via barrel: `import type { SessionState, TranscriptTurn } from "src/mockrill/contracts";` and `import { makeEnvelope } from "src/mockrill/contracts";` — never re-declare or stub.
- `StreamingClient`/`createStreamingClient` MUST be imported from `src/mockrill/voice/streamingClient.ts` or barrel `src/mockrill/voice` — at least one WU verification imports the real type to prove contract holds (see WU-TURN-02).
- `SessionState` MUST be imported from `src/mockrill/contracts` as real type (WU-TURN-02 verification imports it).
- Chassis imports via barrel only: `import { withResilience } from "src/resilience";` — deep imports CI-blocked.
- Excluded modules `src/media`, `src/cost`, `src/dev`, `src/pgm`, `src/profile`, `src/assembly` are absent — never import them.
- None of the consumed contracts may be re-implemented, re-typed, or stubbed; always import from canonical path. `src/*` alias is configured in `tsconfig.json`/`vite.config.ts`.

## §5 Algorithms

### A1 `createSpeaker()` — `src/mockrill/voice/speak.ts` (M21)

**Constants (literal):** `VOICE_WAIT_MS = 1500`, `WATCHDOG_MS = 30000`, `rate = 1.05`, `pitch = 1.0`, `volume = 1.0`.

```
1. Compute available = typeof window !== "undefined" && "speechSynthesis" in window. Store as readonly property.
2. Maintain internal state: let speaking = false (getter), let pendingResolve: (()=>void)|null = null, let watchdog: ReturnType<typeof setTimeout>|null = null, let voices: SpeechSynthesisVoice[] = [] via speechSynthesis.getVoices().
3. Voice selection function selectVoice():
   a. voices = speechSynthesis.getVoices().
   b. If voices.length === 0 return null (caller will trigger async wait).
   c. Find first v where v.lang.startsWith("en-") && v.name.includes("Google") → return v if found.
   d. Else find first v where v.lang.startsWith("en-") → return v if found.
   e. Else return voices[0].
4. Async voice loading:
   a. If available===false: selectVoice never called; speak() short-circuits (step 7).
   b. If voices.length>0 at creation: resolve immediately with selectVoice().
   c. Else attach listener: speechSynthesis.addEventListener("voiceschanged", onVoices, {once:true}) and start 1500 ms timeout.
   d. Whichever fires first (voiceschanged or timeout) removes the other listener/timer, re-reads getVoices(), calls selectVoice(), caches as chosenVoice (may be null → fallback to voices[0] or null).
   e. speaking of fallback: if chosenVoice is null after wait, speak() will not set utterance.voice (browser default).
5. speak(text: string): Promise<void> never-reject algorithm:
   a. If available===false: return Promise.resolve() immediately (caller contract: render text on screen instead).
   b. If speaking===true: call cancel() first (step 6) to clear prior utterance before starting new one.
   c. Create utterance = new SpeechSynthesisUtterance(text).
   d. Set utterance.rate = 1.05, utterance.pitch = 1.0, utterance.volume = 1.0 (literal values; comment: "slightly brisk, like a real screener" must appear above these lines).
   e. If chosenVoice !== null: utterance.voice = chosenVoice; also utterance.lang = chosenVoice.lang.
   f. Set speaking = true.
   g. Return new Promise<void>((resolve) => {
        pendingResolve = resolve;
        const done = (via: string) => {
          if (pendingResolve === null) return;
          speaking = false;
          if (watchdog) { clearTimeout(watchdog); watchdog = null; }
          utterance.onend = null; utterance.onerror = null;
          const r = pendingResolve; pendingResolve = null;
          r(); // never reject
        };
        utterance.onend = () => done("end");
        utterance.onerror = () => done("error"); // resolves, not rejects — session must not stall on TTS failure
        watchdog = setTimeout(() => done("watchdog"), 30000); // 30 s watchdog
        try { speechSynthesis.speak(utterance); } catch { done("catch"); }
      });
6. cancel(): void:
   a. If available===false: if pendingResolve !== null { const r=pendingResolve; pendingResolve=null; r(); } return.
   b. Try { speechSynthesis.cancel(); } catch {}
   c. If pendingResolve !== null { if (watchdog) {clearTimeout(watchdog); watchdog=null;} const r=pendingResolve; pendingResolve=null; r(); }
   d. speaking = false; (also set by done, but ensure)
7. available===false contract (must appear as comment in file):
   // When available===false (SSR or browser without speechSynthesis), speak() resolves immediately.
   // The caller (turnController) MUST render the text on screen instead — check speaker.available before relying on audio.
```

### A2 State machine — `src/mockrill/voice/turnController.ts` (M22/M23)

**Literal constants (exported):**
```ts
export const BARGE_IN_MIN_WORDS = 3 as const;
export const MAX_QUESTIONS = 4 as const;
export const MAX_SESSION_MS = 900000 as const; // 15 min
// 15*60*1000 = 900000

export const THINKING_TIMEOUT_MS = 12000 as const;
export const BARGE_IN_PEAK = 0.15 as const;
export const SPEAK_RATE = 1.05 as const;
```
Canned bridge line: `"Let me follow up on that."` — literal string.

**State variable:** `let state: SessionState = "idle";` (M9 union). Getter `get state(){return state;}`. `on(cb)` stores cbs in array, returns unsubscribe closure, does NOT call cb immediately.

**Transition function (normative):**
```ts
function setState(next: SessionState, reason?: string) {
  if (state === next) return;
  state = next;
  for (const cb of listeners) try { cb(next); } catch {}
}
```
All transitions go through `setState`.

**Full transition table (normative — 11 rows):**

| # | from | event | to | side effects (numbered) |
|---|---|---|---|---|
| T1 | `idle` | `start()` called | `connecting` | 1. setState("connecting"); 2. bus.emit(makeEnvelope("session-start","started",{session_id:deps.sessionId??crypto.randomUUID(), role:deps.role??"frontend", began_at:new Date().toISOString()})); 3. start MAX_SESSION_MS timer (see A6); 4. await mic+client ready (see A2a below); |
| T2 | `connecting` | mic ready + socket open (Begin received) | `speaking` | 1. setState("speaking"); 2. mic.setMuted(true) — muted entire speaking (mute discipline); 3. bus.emit(makeEnvelope("mic-capture","started",{sample_rate:16000, muted:true})); 4. Select first question (asked=[] initially) via nextAction with last_turn=null OR use local first question; 5. Emit question-asked + speaker.speak(action.say) (see A4); |
| T3 | `connecting` | mic denied OR socket degraded (token failure / onDegraded) | `failed` | 1. setState("failed"); 2a. if mic denied: bus.emit(makeEnvelope("mic-capture","error",{sample_rate:16000, muted:false, error: "MicPermissionDenied"})); 2b. if socket degraded: bus.emit(makeEnvelope("session-end","error",{session_id, duration_ms: Date.now()-startedAt, reason: degraded.reason} as any, {degraded:true})); 3. cleanup timers; |
| T4 | `speaking` | speaker finished (speak promise resolved) | `listening` | 1. setState("listening"); 2. mic.setMuted(false); 3. client.updateConfiguration({agent_context: buildAgentContext()}) — push context containing last asked question id + transcript snippet (≤1750 chars); |
| T5 | `speaking` | partial turn arrives with words.length ≥ BARGE_IN_MIN_WORDS (3) — OR 3 consecutive PCM peaks > BARGE_IN_PEAK | `listening` | 1. speaker.cancel(); 2. mic.setMuted(false); 3. setState("listening"); 4. barge-in counter reset; (no envelope for barge, but state change is observable) |
| T6 | `listening` | `onFinal` turn (end_of_turn===true && formatted===true) | `thinking` | 1. mic.setMuted(true); 2. capture tFinal = performance.now(); 3. bus.emit(makeEnvelope("transcript-final","done",{turn})); 4. setState("thinking"); 5. call nextAction(TurnRequest{session_id, asked, last_turn:turn, role}) — with THINKING_TIMEOUT_MS guard (see A5); |
| T7 | `thinking` | action has question !== null | `speaking` | 1. asked.push(action.question.id) (cap at MAX_QUESTIONS); 2. if action.score !== null emit answer-scored (see below) and store score by question_id; 3. capture tSpeakStart = performance.now(); latency_ms = Math.round(tSpeakStart - tFinal); 4. bus.emit(makeEnvelope("question-asked","started",{question:action.question, spoken:action.say, latency_ms} as any)); 5. setState("speaking"); mic.setMuted(true); 6. await speaker.speak(action.say); on resolve → T4; |
| T8 | `thinking` | action.done===true | `scoring` | 1. if action.score !== null emit answer-scored + store; 2. setState("scoring"); 3. build scorecard (if scoring module available) else minimal; bus.emit(makeEnvelope("scorecard-ready","done",{scorecard})); 4. setState("complete"); 5. client.terminate(); mic.stop(); bus.emit(makeEnvelope("session-end","done",{session_id, duration_ms, reason:"done"})); |
| T9 | `scoring` | scorecard built | `complete` | 1. setState("complete"); (already done in T8 if auto) 2. client.terminate(); |
| T10 | any | `stop()` called | `complete` | 1. clear all timers; 2. speaker.cancel(); 3. try{mic.stop()}catch{}; 4. try{await client.terminate()}catch{}; 5. setState("complete"); 6. bus.emit(makeEnvelope("session-end","done",{session_id, duration_ms: Date.now()-startedAt, reason:"stopped"})); |
| T11 | any | unrecoverable degraded (second socket failure, THINKING_TIMEOUT degraded loop) | `failed` | 1. clear timers; 2. setState("failed"); 3. bus.emit(makeEnvelope("session-end","error",{session_id, duration_ms, reason: errorReason, degraded:true} as any, {degraded:true})); |

**A2a — `start()` connecting readiness (detail):**
```
async start():
 1. If state !== "idle" return (idempotent no-throw).
 2. Set startedAt = deps.startedAt ?? Date.now(); start max-session timer = setTimeout(()=> { if (state!=="complete" && state!=="failed") { stop(); emit session-end reason max_session_exceeded } }, MAX_SESSION_MS);
 3. setState("connecting") + emit session-start.
 4. Try: micPromise = deps.mic (already created) OR createMicSource(); wire mic.onChunk((pcm)=>{
      handleMicChunk(pcm); // for BARGE_IN_PEAK detection while speaking
      if (client.state==="open" && state!=="speaking") client.sendAudio(pcm); // mute discipline: only send when not speaking
    });
 5. Try: await client.connect(); client is configured with onPartial->handlePartial, onFinal->handleFinal, onBegin->handleBegin, onDegraded->handleDegraded.
 6. If mic fails with name==="MicPermissionDenied": go T3 mic-denied.
 7. If client.connect returns DegradedResult or onDegraded fires before Begin: go T3 socket degraded.
 8. On Begin: go T2.
```

### A3 Mute discipline + both barge-in triggers

**Mute discipline (single most important rule — must appear as comment in file):**
```
// MUTE DISCIPLINE: mic is muted for the entire duration of `speaking` so the agent never transcribes its own synthesized voice.
// While speaking: mic.setMuted(true) and client.sendAudio is NOT called even if chunks arrive.
// While listening: mic.setMuted(false) and every PCM chunk is forwarded to client.sendAudio.
// While thinking/scoring: mic.setMuted(true).
```

**Barge-in trigger 1 — word count on partial turns (while `speaking` only):**
```
function handlePartial(turn: TranscriptTurn) {
  bus.emit(makeEnvelope("transcript-partial","streaming",{turn}));
  if (state !== "speaking") return;
  const wordCount = turn.words?.length ?? turn.transcript.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount >= BARGE_IN_MIN_WORDS) { // 3
    speaker.cancel();
    mic.setMuted(false);
    consecutivePeakCount = 0;
    setState("listening");
    // also cancel any pending speak watchdog timer tied to speaking
  }
}
```
Note: barge-in is detected from partial turns that arrive *despite* muting only when browser echo cancellation lets speech through.

**Barge-in trigger 2 — amplitude peaks on mic chunks (while `speaking` only):**
```
let consecutivePeakCount = 0;
function handleMicChunk(pcm: Int16Array) {
  if (state !== "speaking") { consecutivePeakCount = 0; return; }
  // Also forward? No — muted, so do NOT forward, but do analyze for barge-in.
  const peak = computePeak(pcm); // 0..1
  if (peak > BARGE_IN_PEAK) { // 0.15
    consecutivePeakCount++;
    if (consecutivePeakCount >= 3) {
      consecutivePeakCount = 0;
      speaker.cancel();
      mic.setMuted(false);
      setState("listening");
    }
  } else {
    consecutivePeakCount = 0;
  }
}
```

**Amplitude computation — numbered steps (normative):**
```
function computePeak(pcm: Int16Array): number {
  1. If pcm.length === 0 return 0.
  2. Let maxAbs = 0 (number).
  3. For each sample s in pcm: abs = Math.abs(s); if abs > maxAbs maxAbs = abs;
  4. peak = maxAbs / 0x7FFF; // 0x7FFF = 32767; normalize Int16 to 0..1 (≈1.0 for 32767, ~0.00003 for 1)
  5. Return peak (0..1). // alternative if Float32 path: peak = max over Math.abs(sample) already 0..1
}
```
For Float32 PCM path (if mic ever emits Float), step 4 is `peak = maxAbs` (already 0..1) without division. Normative Int16 path uses division.

### A4 `nextAction` wiring and THINKING_TIMEOUT bridge

```
let thinkingTimer: ReturnType<typeof setTimeout>|null = null;
let tFinalMs = 0; // performance.now() captured in T6
async function handleFinal(turn: TranscriptTurn) {
  if (state !== "listening") return;
  // T6 steps
  setState("thinking");
  tFinalMs = performance.now();
  mic.setMuted(true);
  bus.emit(makeEnvelope("transcript-final","done",{turn}));
  const req: TurnRequest = { session_id: sessionId, asked: [...askedIds], last_turn: turn, role: role ?? "frontend" };
  // Race nextAction vs timeout
  let action: InterviewerAction | null = null;
  let timedOut = false;
  const timeoutP = new Promise<"timeout">(resolve => {
    thinkingTimer = setTimeout(()=> resolve("timeout"), THINKING_TIMEOUT_MS); // 12000
  });
  const actionP = (async () => {
    try { return await deps.nextAction(req); } catch (e) { return { say:"Let me follow up on that.", question: null, score: null, done:false, degraded:true } as InterviewerAction; }
  })();
  const result = await Promise.race([actionP, timeoutP]);
  if (thinkingTimer) { clearTimeout(thinkingTimer); thinkingTimer=null; }
  if (result === "timeout") {
    timedOut = true;
    // Bridge line — spoken degraded, session continues
    const bridgeAction: InterviewerAction = { say: "Let me follow up on that.", question: firstRemainingQuestion() ?? null, score: null, done:false, degraded:true };
    bus.emit(makeEnvelope("question-asked","started",{question: bridgeAction.question!, spoken: bridgeAction.say, latency_ms: THINKING_TIMEOUT_MS} as any, {degraded:true}));
    setState("speaking"); mic.setMuted(true);
    await speaker.speak(bridgeAction.say); // still subject to never-reject + watchdog
    setState("listening"); mic.setMuted(false);
    client.updateConfiguration({agent_context: buildAgentContext()});
    return;
  } else {
    action = result as InterviewerAction;
  }
  // Normal path
  if (action.done === true) { // T8
    if (action.score) { storeScore(action.score); bus.emit(makeEnvelope("answer-scored","done",{score: action.score})); }
    setState("scoring");
    const scorecard = buildScorecardStub(); // or real scoring if available
    bus.emit(makeEnvelope("scorecard-ready","done",{scorecard} as any));
    setState("complete");
    await client.terminate();
    mic.stop();
    bus.emit(makeEnvelope("session-end","done",{session_id:sessionId, duration_ms: Date.now()-startedAt, reason:"done"}));
    return;
  }
  if (action.question) { // T7
    storeScoreIfPresent(action.score);
    if (action.score) bus.emit(makeEnvelope("answer-scored","done",{score: action.score}));
    askedIds.push(action.question.id);
    if (askedIds.length >= MAX_QUESTIONS) action.done = true; // cap enforces MAX_QUESTIONS=4
    const tSpeakStart = performance.now();
    const latency_ms = Math.round(tSpeakStart - tFinalMs);
    bus.emit(makeEnvelope("question-asked","started",{question: action.question, spoken: action.say, latency_ms} as any));
    setState("speaking"); mic.setMuted(true);
    await speaker.speak(action.say);
    setState("listening"); mic.setMuted(false);
    client.updateConfiguration({agent_context: buildAgentContext()});
  }
}
```
At most ONE `nextAction` call per `onFinal`; never throws to UI — catch returns degraded bridge-like action.

### A5 `drill(questionId)` — re-drill in same session without reconnecting

```
async drill(questionId: string): Promise<void> {
  1. If state !== "complete" && state !== "scoring" && state !== "listening" && state !== "speaking": return (no-throw; also valid from "complete"); // allow drill after scorecard
  2. Lookup question = questionBank[questionId] ?? askedQuestionsMap[questionId]; if !question return;
  3. Determine attempt = (drillAttempts.get(questionId) ?? 0) + 1; drillAttempts.set(questionId, attempt);
  4. Determine weakestAxis = find weakest axis of prior AnswerScore for this question (min axes value; tie → "structure"); if no prior score, weakestAxis = "specificity".
  5. Build framingLine: `Let's revisit that. For "${question.text}" — focus on ${weakestAxis}. Take another pass.`
     // literal template: `Let's revisit that. For "${q}" — focus on ${axis}. Take another pass.`
  6. bus.emit(makeEnvelope("drill-start","started",{question_id: questionId, attempt}));
  7. // DO NOT reconnect socket — state this explicitly: client stays open, mic stays wired.
  8. setState("speaking"); mic.setMuted(true);
  9. const tFinalDrill = performance.now(); // for latency parity, but drill latency not measured (no onFinal)
  10. await speaker.speak(framingLine); // never-reject
  11. setState("listening"); mic.setMuted(false);
  12. client.updateConfiguration({agent_context: `drill:${questionId}:attempt=${attempt}`});
  13. // Now candidate answers; on next handleFinal, storeScore will REPLACE prior AnswerScore for this question:
  14. // storeScore(drillScore) does: scoresByQuestionId.set(questionId, newScore) overwriting, not pushing duplicate.
}
```
Socket stays open — `client.connect()` is NOT called inside `drill`. This is what makes "re-drill in the same session" true (FR-09).

### A6 Latency instrumentation (NFR-06) + hard stop

```
// Latency budget: end_of_turn (onFinal) → interviewer starts speaking ≤ 2.0 s p50
// Measurement:
// - tFinal = performance.now() at start of handleFinal (T6 step 2)
// - tSpeakStart = performance.now() immediately before speaker.speak(action.say) in T7
// - latency_ms = Math.round(tSpeakStart - tFinal)
// - Logged into question-asked envelope payload as {question, spoken, latency_ms}
// Envelope payload type extension (documented, not in M11 strictly): question-asked payload includes optional latency_ms:number for observability.
// On stage: filter envelopes where step_id==="question-asked" and show latency_ms values; p50 is median of array.
```

Hard stop:
```
let maxSessionTimer: ReturnType<typeof setTimeout>|null = null;
function armHardStop() {
  maxSessionTimer = setTimeout(()=> {
    if (state==="complete"||state==="failed") return;
    setState("failed");
    bus.emit(makeEnvelope("session-end","error",{session_id:sessionId, duration_ms: MAX_SESSION_MS, reason:"max_session_exceeded", degraded:true} as any, {degraded:true}));
    speaker.cancel(); mic.stop(); client.terminate();
  }, MAX_SESSION_MS); // 900000
}
function clearHardStop(){ if(maxSessionTimer){clearTimeout(maxSessionTimer); maxSessionTimer=null;} }
// Called in start() and cleared in stop()/complete/failed.
```

### A7 Score replacement on drill

```
const scoresByQuestionId = new Map<string, AnswerScore>();
function storeScore(score: AnswerScore) {
  // If question_id already exists (drill), REPLACE; do not duplicate in per_question array.
  scoresByQuestionId.set(score.question_id, score);
}
function getScoresArray(): AnswerScore[] { return [...scoresByQuestionId.values()]; }
// buildScorecard uses getScoresArray() so re-drill result overwrites weakest attempt.
```

### A8 `stop()` from any state

```
async stop(): Promise<void> {
  if (state==="complete"||state==="failed") return;
  clearHardStop(); if(thinkingTimer){clearTimeout(thinkingTimer); thinkingTimer=null;}
  speaker.cancel();
  try{ mic.stop(); }catch{}
  try{ await client.terminate(); }catch{}
  setState("complete");
  bus.emit(makeEnvelope("session-end","done",{session_id:sessionId, duration_ms: Date.now()-startedAt, reason:"stopped"}));
}
```
Never throws.


## §6 Configuration, environment & files

### Env vars

| Name | Who reads it | Default | What happens when missing | Where set |
|---|---|---|---|---|
| `ASSEMBLYAI_API_KEY` | `api/aai-token.ts` + `api/turn.ts` only (server) | none — required | Not read by this plan; `createTurnController` degrades via `nextAction` returning `degraded:true` bridge; `speak` still works (browser) | Vercel env / `.env.local` |
| `MOCKRILL_LLM_FALLBACK_MODEL` | DP-INTERVIEWER only | `qwen3.5-4b-32k-fast` | Not used by this plan | Vercel env |
| `RES_FORCED_DEGRADED` | chassis `src/resilience` kill switch | unset / `0` | When `=1`, `nextAction` via `withResilience` returns cached `InterviewerAction`; turnController still measures `latency_ms` and transitions normally | test/CI |

This plan owns **no** env var. `speak.ts` and `turnController.ts` are browser-only and never read `process.env`.

### Config files

- `tsconfig.json` / `vite.config.ts` already configure `src/*` alias, `moduleResolution: NodeNext`, `strict:true`, `noUncheckedIndexedAccess:true`, `jsx: react-jsx`. This plan does not edit them. `src/*` alias used for all imports.
- `vercel.json` owned by DP-DEPLOY; no edit here.
- No new npm dependency; `window.speechSynthesis` only, no TTS vendor SDK.
- `engine/voice/policy.todo.md` stub is DELETED and replaced by `engine/voice/policy.md`.

### Complete file map — everything this plan creates or edits

| Path | Action | Description |
|---|---|---|
| `src/mockrill/voice/speak.ts` | **CREATE** | M21 `createSpeaker()` — available, voice selection (Google→en→first, 1500 ms wait), speak never-reject + 30 s watchdog, cancel, fixed rate/pitch/volume |
| `src/mockrill/voice/turnController.ts` | **CREATE** | M22/M23 `createTurnController` + `TurnControllerDeps` + 5 exported constants (`BARGE_IN*`, `MAX_*`, `THINKING*`) + state machine 11-row table, mute discipline, dual barge-in, `nextAction` race, `drill()` without reconnect, `latency_ms`, hard stop, `on()` subscribe |
| `src/mockrill/voice/index.ts` | **READ** (no edit) | Barrel owned by DP-AAI-STREAM; this plan's files are forwarded by it — note sequencing: barrel depends on this plan's files existing |
| `engine/voice/policy.md` | **CREATE** (replaces stub) | Prose policy: turn-end, barge-in, mute, latency budget, hard stop, drill, degradation — 6 headings |
| `engine/voice/policy.todo.md` | **DELETE** | Stub removed |
| `tests/mockrill/voice/speak.test.ts` | **CREATE** | WU-TURN-01 verification: fake `window.speechSynthesis`, voice selection, never-reject |
| `tests/mockrill/voice/turnController.test.ts` | **CREATE** | WU-TURN-02 verification: drives `idle→connecting→speaking→listening→thinking→speaking` with fakes, prints visited states |
| `tests/mockrill/voice/barge-in.test.ts` | **CREATE** | WU-TURN-03 verification: both barge-in triggers |
| `tests/mockrill/voice/thinking.test.ts` | **CREATE** | WU-TURN-04 verification: thinking timeout bridge line |
| `tests/mockrill/voice/drill.test.ts` | **CREATE** | WU-TURN-05 verification: drill without reconnect, score replacement |
| `tests/mockrill/voice/latency.test.ts` | **CREATE** | WU-TURN-06 verification: `latency_ms` in `question-asked` payload |
| `private/design_documents/design_plans/DP-TURNTAKING.md` | **CREATE** | This plan |

## §7 Failure & degradation behavior

| Failure | Detection | `DegradedResult` reason string | What the user sees | Fallback-ladder rung (DP-DEMOPROOF `docs/fallback-ladder.md`) |
|---|---|---|---|---|
| `speechSynthesis` unavailable (`available===false`) | `typeof window` check at `createSpeaker()` | N/A — not `DegradedResult` | `speak()` resolves immediately; turnController renders `action.say` as text on screen; session continues without audio | Rung 4 — none (browser capability) |
| `speechSynthesis` `error` event or 30 s watchdog fires | `utterance.onerror` or `setTimeout 30000` | N/A — speak resolves (never rejects) | No stall; state proceeds `speaking→listening`; envelope still emitted; UI shows text | Rung 4 — none |
| `speechSynthesis.getVoices()` empty after 1500 ms | Timeout of `voiceschanged` wait | N/A | Fallback to `voices[0]` or no `voice` set (browser default); speak still works | Rung 4 — none |
| Mic permission denied (`NotAllowedError`) | `createMicSource` rejects with `name==="MicPermissionDenied"` | `"MicPermissionDenied"` via envelope `mic-capture` error payload (not `DegradedResult` version) | `connecting→failed`; `bus.emit(mic-capture error)`; UI shows permission prompt; `session-end` error | Rung 4 — none (user action required) |
| Socket token failure / `onDegraded` before `Begin` | `client.connect()` returns `DegradedResult` or `onDegraded` callback | `"aai_token_unavailable"` or `"aai_socket_lost"` (from DP-AAI-STREAM) | `connecting→failed`; `session-end` error with `degraded:true` | Rung 2/1 — cache/replay if `RES_FORCED_DEGRADED` |
| WebSocket unexpected close while `speaking`/`listening` | `onDegraded` from streamingClient | `"aai_socket_lost"` | First close auto-reconnects (DP-AAI-STREAM); second → `any→failed` with `session-end` error degraded | Rung 4 → Rung 1 if forced |
| `nextAction` (`/api/turn`) network failure / throws | `deps.nextAction` rejects | Returned by DP-INTERVIEWER as `DegradedResult`; turnController catches and maps to bridge-like `InterviewerAction{degraded:true}` | `thinking` continues via catch branch; may speak bridge line or proceed degraded; never throws to UI | Rung 2/1 |
| `nextAction` exceeds `THINKING_TIMEOUT_MS=12000` | `Promise.race` timeout wins | N/A — synthetic `"thinking_timeout"` degraded path | Speak canned `“Let me follow up on that.”` and continue `speaking→listening` degraded; envelope `question-asked` with `degraded:true` | Rung 4 — degraded continuation |
| Session exceeds `MAX_SESSION_MS=900000` | `setTimeout` 900000 from `start()` | `"max_session_exceeded"` in `session-end` error payload | `→failed` (or `→complete` via `stop()`); `speaker.cancel()`, `mic.stop()`, `client.terminate()`; UI shows time limit | Rung 4 — none |
| `stop()` called from any state | Explicit call | N/A | `→complete`; cancel speak, stop mic, terminate socket, `session-end` done `reason:"stopped"` | Rung 4 — none |
| `drill()` called with unknown `questionId` | Lookup miss | N/A | No-op, never throws; state unchanged | N/A |
| Any other exception inside turnController | `try/catch` around every async boundary | `"turncontroller_unhandled"` if needed, else map to `session-end` error `degraded:true` | `→failed` with `session-end` error; never throws to React boundary | Rung 4 |

**Invariant (NFR-02):** Nothing in `speak.ts` or `turnController.ts` throws to the UI. Every `await` is `try/catch` wrapped; `speak()` never rejects; `nextAction` rejection is caught; `mic`/`client`/`bus` calls are guarded. Degraded paths always emit an envelope and transition to `failed`/`complete`.

## §8 Public surface & import rules

### What is exported (public surface)

Via `src/mockrill/voice/speak.ts` (M21):
- `createSpeaker`, type `Speaker`

Via `src/mockrill/voice/turnController.ts` (M22/M23):
- `createTurnController`, types `TurnController`, `TurnControllerDeps`
- Constants: `BARGE_IN_MIN_WORDS`, `MAX_QUESTIONS`, `MAX_SESSION_MS`, `THINKING_TIMEOUT_MS`, `BARGE_IN_PEAK` (each `as const`)

Via `src/mockrill/voice/index.ts` (M20 barrel owned by DP-AAI-STREAM — not owned here but forwarded):
- This plan's exports are forwarded by that barrel; implementor must ensure `src/mockrill/voice/speak.ts` and `turnController.ts` exist before barrel is checked.

### What is internal (not exported)

- `computePeak(pcm)` helper inside `turnController.ts` — internal, not exported (tests verify via behavior, not direct import).
- `voiceschanged` listener, watchdog timer, pendingResolve closure inside `speak.ts` — internal.
- `consecutivePeakCount`, `tFinalMs`, `thinkingTimer`, `maxSessionTimer`, `scoresByQuestionId`, `drillAttempts` closures inside `turnController.ts` — internal mutable state.
- `buildAgentContext()` helper — internal string builder capped at 1750 chars.

### Import rules (binding)

1. Barrel is the only public surface for consumers outside `src/mockrill/voice/`: `import { createSpeaker, createTurnController } from "src/mockrill/voice";` and `import type { Speaker, TurnController, TurnControllerDeps } from "src/mockrill/voice";` Deep imports `from "src/mockrill/voice/speak"` or `from "src/mockrill/voice/turnController"` are FORBIDDEN outside `src/mockrill/voice/` (except the two files themselves and the barrel).
2. Inside `speak.ts`: no imports from `src/mockrill/*` or `src/resilience`; only globals `window`, `speechSynthesis`, `SpeechSynthesisUtterance`.
3. Inside `turnController.ts`: allowed imports are `import type { SessionState, TranscriptTurn, InterviewQuestion, AnswerScore } from "src/mockrill/contracts";`, `import { makeEnvelope } from "src/mockrill/contracts";`, `import type { StreamingClient } from "src/mockrill/voice/streamingClient.js";`, `import type { Speaker } from "./speak.js";`, `import type { MockrillEventBus } from "src/mockrill/ui/eventBus.js";`, `import type { TurnRequest, InterviewerAction } from "src/mockrill/engine/types.js";` — no other imports. Never import `src/media`, `src/cost`, `src/dev`, etc.
4. `SessionState` and `StreamingClient` must be imported as real types (not redeclared) — proven by WU-TURN-02 verification that imports both from their canonical paths.
5. No file in this plan may read `ASSEMBLYAI_API_KEY` or create its own `withResilience` around LLM — `nextAction` injection already handles it.

## §9 Work units

### WU-TURN-01 — `createSpeaker` (M21) with voice-selection and never-reject rules

- **Goal:** Implement `src/mockrill/voice/speak.ts` → `createSpeaker()` exactly per §5 A1, with no vendor SDK.
- **Depends on:** none (leaf; DP-CONTRACTS M9/voice types already exist but not required for this WU).
- **Files touched:** `src/mockrill/voice/speak.ts` (CREATE), `tests/mockrill/voice/speak.test.ts` (CREATE).
- **Numbered implementation steps:**
  1. Create file `src/mockrill/voice/speak.ts` with header comment `// DP-TURNTAKING M21 — browser TTS via window.speechSynthesis; no vendor SDK`.
  2. Export `type Speaker = { speak(text:string):Promise<void>; cancel():void; readonly speaking:boolean; readonly available:boolean }`.
  3. Implement `export function createSpeaker(): Speaker` per §5 A1: compute `available = typeof window !== "undefined" && "speechSynthesis" in window`; store `speaking` getter; implement `selectVoice()` with Google→en→first order; implement `voiceschanged` wait with `VOICE_WAIT_MS=1500` timeout (use `addEventListener` + `setTimeout` race, cleanup); implement `speak` that resolves on `end`/`error`/`watchdog 30000`, never rejects, handles `available===false` immediate resolve; implement `cancel()` calling `speechSynthesis.cancel()` and resolving pending promise; set `utterance.rate=1.05, pitch=1.0, volume=1.0` with comment `// slightly brisk, like a real screener`.
  4. Add contract comment when `available===false` caller must render text on screen.
  5. No imports at top (browser globals only); ensure file has no `import from "src/resilience"` or `src/media`.
  6. Create test `tests/mockrill/voice/speak.test.ts`:
     ```ts
     import { describe, it, expect, vi } from "vitest";
     // fake window.speechSynthesis
     class FakeUtterance { text: string; rate=1; pitch=1; volume=1; voice:any=null; lang=""; onend: any=null; onerror:any=null; constructor(t:string){this.text=t;} }
     const voices = [{name:"Google US English", lang:"en-US"},{name:"Other", lang:"en-GB"}];
     const fakeSynth: any = { getVoices: vi.fn(()=>voices), speak: vi.fn((u:any)=> setTimeout(()=>u.onend?.(),0)), cancel: vi.fn(), addEventListener: vi.fn((ev,cb)=> setTimeout(cb,0)) };
     (globalThis as any).window={ speechSynthesis: fakeSynth }; (globalThis as any).speechSynthesis=fakeSynth; (globalThis as any).SpeechSynthesisUtterance=FakeUtterance;
     import { createSpeaker } from "src/mockrill/voice/speak.js";
     describe("createSpeaker",()=>{ it("available and never-reject", async ()=>{ const s=createSpeaker(); expect(s.available).toBe(true); await expect(s.speak("hello")).resolves.toBeUndefined(); s.cancel(); expect(s.speaking).toBe(false); }); });
     ```
     Adjust mock to test error path resolves: call `u.onerror` and expect resolve not reject.
  7. Ensure `npx tsc --noEmit` passes.
- **Verification command (one runnable line):**
  ```sh
  npx vitest run tests/mockrill/voice/speak.test.ts
  ```
- **Expected output (last lines):**
  ```
   ✓ tests/mockrill/voice/speak.test.ts (1 test)
  Test Files  1 passed (1)
       Tests  1 passed (1)
  ```
- **Done-when:** `speak.ts` contains literal `rate: 1.05`, `voiceschanged`, `1500`, `30000`, `available = typeof window`, and test passes without rejection.

### WU-TURN-02 — state machine skeleton and transition table (M22) — drives real machine through 6 states

- **Goal:** Implement `src/mockrill/voice/turnController.ts` skeleton with 11-row table, real `SessionState` type import and real `StreamingClient` type import, testable via injected fakes; prove cross-module contracts hold.
- **Depends on:** WU-TURN-01 (speaker exists), DP-CONTRACTS (SessionState), DP-AAI-STREAM (StreamingClient type exists conceptually — type-only import, file may not yet exist on disk but `src/mockrill/voice/streamingClient.ts` path must be importable as type; if file absent, create minimal stub `export type StreamingClient = {state:string; connect():Promise<any>; sendAudio():void; updateConfiguration():void; forceEndpoint():void; terminate():Promise<void>}` for type-check, but plan mandates real file eventually).
- **Files touched:** `src/mockrill/voice/turnController.ts` (CREATE), `tests/mockrill/voice/turnController.test.ts` (CREATE).
- **Numbered implementation steps:**
  1. Create `src/mockrill/voice/turnController.ts` with header `// DP-TURNTAKING M22/M23 — turn-taking state machine; SessionState from src/mockrill/contracts, StreamingClient from src/mockrill/voice/streamingClient`.
  2. Add imports exactly:
     ```ts
     import type { SessionState, TranscriptTurn } from "src/mockrill/contracts";
     import { makeEnvelope } from "src/mockrill/contracts";
     import type { StreamingClient } from "src/mockrill/voice/streamingClient.js";
     import type { Speaker } from "./speak.js";
     import type { MockrillEventBus } from "src/mockrill/ui/eventBus.js";
     import type { TurnRequest, InterviewerAction } from "src/mockrill/engine/types.js";
     ```
     (Proves cross-module contract: real `SessionState` from contracts and real `StreamingClient` from streamingClient.)
  3. Export constants `BARGE_IN_MIN_WORDS = 3 as const`, `MAX_QUESTIONS = 4 as const`, `MAX_SESSION_MS = 900000 as const`, `THINKING_TIMEOUT_MS = 12000 as const`, `BARGE_IN_PEAK = 0.15 as const`.
  4. Export `type TurnControllerDeps = { mic: { onChunk(cb:(pcm:Int16Array)=>void):void; setMuted(m:boolean):void; stop():void; stream?:MediaStream }; client: StreamingClient; speaker: Speaker; bus: MockrillEventBus; nextAction(input: TurnRequest): Promise<InterviewerAction>; sessionId?: string; role?: string; startedAt?: number; }` and `type TurnController = { start():Promise<void>; stop():Promise<void>; drill(questionId:string):Promise<void>; readonly state: SessionState; on(cb:(s:SessionState)=>void):()=>void }`.
  5. Implement internal `let state: SessionState = "idle"`, `listeners: ((s:SessionState)=>void)[]`, `setState(next)` that skips if same and notifies listeners, getter `get state(){return state;}`, `on(cb)` push and return unsubscribe.
  6. Implement `start()` per §5 A2a: guard `state!=="idle"` no-throw, set `sessionId = deps.sessionId ?? crypto.randomUUID()` (fallback `Date.now` string), emit `session-start` started via `bus.emit(makeEnvelope("session-start","started",{session_id:sessionId, role:deps.role??"frontend", began_at:new Date().toISOString()}))`, arm `MAX_SESSION_MS` timer, wire `client` callbacks (`onPartial→handlePartial`, `onFinal→handleFinal`, `onBegin→handleBegin`, `onDegraded`), wire `mic.onChunk`, call `client.connect()`, handle T3 degraded, on Begin go T2 (setState speaking, mic.setMuted(true), emit mic-capture started, call nextAction for first question or use synthetic first question if nextAction returns question).
  7. Implement `handleBegin`, `handlePartial` (emit transcript-partial, barge-in word-count check), `handleFinal` (per A4: mic.setMuted(true), emit transcript-final, setState thinking, race nextAction vs timeout), `handleMicChunk` per A3 amplitude, `stop()` per A8, `drill()` stub (full logic in WU-TURN-05 — here just emit drill-start and speak framing line skeleton).
  8. Ensure 11-row table appears as comment above `setState` for reviewer traceability.
  9. Create test `tests/mockrill/voice/turnController.test.ts` that drives real state machine through `idle → connecting → speaking → listening → thinking → speaking` with fakes and prints visited states:
     ```ts
     import { createTurnController } from "src/mockrill/voice/turnController.js";
     import type { SessionState } from "src/mockrill/contracts";
     import type { StreamingClient } from "src/mockrill/voice/streamingClient.js";
     // prove type imports resolve
     const _typeCheck: SessionState = "idle"; const _clientType: StreamingClient|null=null;
     const visited: string[]=[];
     const fakeBus:any={ emit:(e:any)=>{}, subscribe:()=>()=>{}, snapshot:()=>[], reset:()=>{} };
     const fakeSpeaker:any={ available:true, speaking:false, speak: async (t:string)=>{}, cancel:()=>{} };
     const fakeMic:any={ onChunk:(cb:any)=>{ (fakeMic as any)._cb=cb; }, setMuted:()=>{}, stop:()=>{} };
     let onPartial:any, onFinal:any, onBegin:any;
     const fakeClient:any={ state:"closed", connect: async ()=>{ fakeClient.state="open"; setTimeout(()=> onBegin?.("id1"),0); }, sendAudio:()=>{}, updateConfiguration:()=>{}, forceEndpoint:()=>{}, terminate: async ()=>{ fakeClient.state="closed"; } };
     const fakeNextAction = async (req:any)=> ({ say:"What is your strength?", question:{id:"q1", text:"What is your strength?", competency:"behavioral", difficulty:1, follow_ups:[], keyterms:[]}, score:null, done:false, degraded:false });
     fakeClient.connect = async ()=>{ fakeClient.state="open"; onBegin?.("id1"); };
     // wire via create — we need to capture callbacks: override createStreamingClient behaviour by injecting opts
     // Instead create controller with fakeClient that stores callbacks from deps? Controller internally wires onPartial/onFinal via client opts? Adjust: fakeClient stores callbacks passed at connect time — for this test we simulate via direct calls to handleFinal/Partial by exposing controller internals or by calling onFinal directly.
     ```
     Simpler verified test (normative for plan): the test file actually imports the real turnController and uses fake deps that the controller wires, then manually triggers `onFinal` path:
     ```ts
     import { describe, it } from "vitest";
     import { createTurnController } from "src/mockrill/voice/turnController.js";
     describe("state machine",()=>{ it("visits 6 states", async ()=>{
       const visited:string[]=[];
       const bus:any={ emit:()=>{}, subscribe:()=>()=>{}, snapshot:()=>[], reset:()=>{} };
       const speaker:any={ available:true, get speaking(){return false;}, speak: async (t:string)=> visited.push("speak:"+t.slice(0,10)), cancel:()=>{} };
       const mic:any={ onChunk:()=>{}, setMuted:(m:boolean)=> visited.push("muted:"+m), stop:()=>{} };
       const client:any={ state:"closed", sendAudio:()=>{}, updateConfiguration:()=>{}, forceEndpoint:()=>{}, terminate: async ()=>{}, connect: async ()=>{ client.state="open"; } };
       // create controller with nextAction that returns a question
       const c = createTurnController({ mic, client, speaker, bus, nextAction: async ()=>({ say:"Hello question?", question:{id:"q1", text:"Hello?", competency:"behavioral", difficulty:1, follow_ups:[], keyterms:[]}, score:null, done:false, degraded:false }) as any });
       c.on(s=> visited.push(s));
       await c.start(); // idle->connecting
       // simulate Begin -> speaking
       (c as any)._testHandleBegin?.("id1"); // or directly call internal via exposed test seam; if not exposed, visited will contain connecting,speaking via start()
       console.log(visited.join(" -> "));
     })});
     ```
     **Normative verification one-liner (plan mandates exact stdout):** the final WU verification command drives the machine and prints visited states; implementor must ensure output is exactly `idle -> connecting -> speaking -> listening -> thinking -> speaking` (see verification below).
  10. Export test seam `_testHandleBegin`, `_testHandlePartial`, `_testHandleFinal` only in test build (guard `if (process.env.NODE_ENV!=="production")` expose) to make WU verifiable without mocking WebSocket.
- **Verification command (one runnable line — MUST drive real state machine and print visited states):**
  ```sh
  npx vite-node tests/mockrill/voice/turnController.test.ts 2>&1 | head -n 20
  ```
  Alternative `npx vitest run tests/mockrill/voice/turnController.test.ts --reporter=verbose` is acceptable but plan mandates one of them prints visited states line.
  **Normative WU mandates this command:**
  ```sh
  npx vite-node -e "import {createTurnController} from 'src/mockrill/voice/turnController.js'; import type {SessionState} from 'src/mockrill/contracts'; import type {StreamingClient} from 'src/mockrill/voice/streamingClient.js'; const visited: string[]=[]; const bus:any={emit:()=>{},subscribe:()=>()=>{},snapshot:()=>[],reset:()=>{}}; const speaker:any={available:true,get speaking(){return false;},speak: async (t:string)=>{},cancel:()=>{}}; const mic:any={onChunk:()=>{},setMuted:()=>{},stop:()=>{}}; const client:any={state:'closed',sendAudio:()=>{},updateConfiguration:()=>{},forceEndpoint:()=>{},terminate: async ()=>{},connect: async ()=>{client.state='open';}}; const c=createTurnController({mic,client,speaker,bus,nextAction: async ()=>({say:'Q1?',question:{id:'q1',text:'Q1?',competency:'behavioral',difficulty:1,follow_ups:[],keyterms:[]},score:null,done:false,degraded:false}) as any}); c.on(s=>visited.push(s)); visited.push(c.state); await c.start(); visited.push(c.state); // connecting
  // simulate Begin -> speaking via test seam if available, else manually set
  if((c as any)._testHandleBegin) (c as any)._testHandleBegin('id1'); visited.push(c.state);
  // simulate speaker finished -> listening
  if((c as any)._testSpeakerFinished) (c as any)._testSpeakerFinished(); visited.push(c.state);
  // simulate onFinal -> thinking
  const turn={turn_order:0,transcript:'hello world answer',formatted:true,end_of_turn:true,end_of_turn_confidence:0.9,words:[{text:'hello',start:0,end:200,confidence:0.9,word_is_final:true},{text:'world',start:200,end:400,confidence:0.9,word_is_final:true},{text:'answer',start:400,end:600,confidence:0.9,word_is_final:true}],speaker:'candidate',received_at:new Date().toISOString()};
  if((c as any)._testHandleFinal) await (c as any)._testHandleFinal(turn); visited.push(c.state);
  console.log(visited.join(' -> '));"
  ```
- **Expected output (exact text):**
  ```
  idle -> connecting -> speaking -> listening -> thinking -> speaking
  ```
  If test seam names differ, implementor must alias to produce this exact stdout; plan mandates this literal string appears.
- **Done-when:** `turnController.ts` imports real `SessionState` and real `StreamingClient` types (verified by `npx tsc --noEmit` with no `Cannot find module` error), and the vite-node one-liner prints exactly `idle -> connecting -> speaking -> listening -> thinking -> speaking`.

### WU-TURN-03 — mute discipline + both barge-in triggers

- **Goal:** Wire mute discipline (mic muted entire `speaking`, echo-cancellation comment) and both barge-in triggers (word-count ≥3 and 3× peak >0.15) with `computePeak` steps.
- **Depends on:** WU-TURN-02 (state machine skeleton).
- **Files touched:** `src/mockrill/voice/turnController.ts` (EDIT), `tests/mockrill/voice/barge-in.test.ts` (CREATE).
- **Numbered implementation steps:**
  1. In `turnController.ts`, add mute-discipline comment verbatim above `setMuted` calls: `// MUTE DISCIPLINE: mic is muted for the entire duration of speaking so the agent never transcribes its own synthesized voice.`
  2. Ensure every `setState("speaking")` is immediately preceded/followed by `mic.setMuted(true)` and every `setState("listening")` by `mic.setMuted(false)`; `thinking`/`scoring` also `mic.setMuted(true)`.
  3. In `mic.onChunk` handler, do NOT call `client.sendAudio` when `state==="speaking"`; only when `listening`. Always call `handleMicChunk` for barge-in analysis even while muted.
  4. Implement `handlePartial` word-count barge-in: if `state==="speaking"` and `turn.words.length >= BARGE_IN_MIN_WORDS` (or fallback split count), then `speaker.cancel()`, `mic.setMuted(false)`, `consecutivePeakCount=0`, `setState("listening")`.
  5. Implement `computePeak(pcm:Int16Array):number` per §5 A3 steps 1-5 (max abs / 0x7FFF) and `handleMicChunk` per §5 A3 that tracks `consecutivePeakCount` and fires after 3 consecutive peaks > BARGE_IN_PEAK (0.15) while speaking, with same cancel+unmute+listening.
  6. Reset `consecutivePeakCount=0` on every transition out of `speaking` and on any non-peak chunk.
  7. Create test `tests/mockrill/voice/barge-in.test.ts`:
     ```ts
     import { describe, it, expect } from "vitest";
     import { createTurnController, BARGE_IN_MIN_WORDS, BARGE_IN_PEAK } from "src/mockrill/voice/turnController.js";
     describe("barge-in",()=>{
       it("word count triggers", async ()=>{
         const bus:any={emit:()=>{},subscribe:()=>()=>{},snapshot:()=>[],reset:()=>{}};
         const speaker:any={available:true, speaking:true, speak: async ()=>{}, cancel: vi.fn()};
         const mic:any={onChunk:()=>{}, setMuted: vi.fn(), stop:()=>{}};
         const client:any={state:"open", sendAudio:()=>{}, updateConfiguration:()=>{}, forceEndpoint:()=>{}, terminate: async ()=>{}, connect: async ()=>{}};
         const c=createTurnController({mic,client,speaker,bus,nextAction: async ()=>({} as any)});
         // drive to speaking via test seam
         (c as any)._testSetState?.("speaking");
         expect(c.state).toBe("speaking");
         const partial={turn_order:0, transcript:"hello world again", formatted:false, end_of_turn:false, end_of_turn_confidence:0.3, words:[{text:"hello",start:0,end:100,confidence:0.9,word_is_final:false},{text:"world",start:100,end:200,confidence:0.9,word_is_final:false},{text:"again",start:200,end:300,confidence:0.9,word_is_final:false}], speaker:"candidate", received_at:new Date().toISOString()};
         (c as any)._testHandlePartial(partial);
         expect(c.state).toBe("listening"); expect(speaker.cancel).toHaveBeenCalled();
       });
       it("amplitude triggers after 3 peaks", async ()=>{
         // similar but feed 3 Int16Array chunks with max 8000 (>0.15*32767≈4915)
       });
     });
     ```
  8. Ensure `BARGE_IN_MIN_WORDS` and `BARGE_IN_PEAK` constants are exported and tested.
- **Verification command:**
  ```sh
  npx vitest run tests/mockrill/voice/barge-in.test.ts
  ```
- **Expected output:**
  ```
   ✓ tests/mockrill/voice/barge-in.test.ts (2 tests)
  Test Files  1 passed (1)
       Tests  2 passed (2)
  ```
- **Done-when:** Both barge-in paths transition `speaking→listening`, call `speaker.cancel()` and `mic.setMuted(false)`, peak computed as `maxAbs/0x7FFF`.

### WU-TURN-04 — `nextAction` wiring and `THINKING_TIMEOUT_MS` bridge line

- **Goal:** Wire `handleFinal` → `thinking` → `nextAction` race with 12 s timeout that speaks `“Let me follow up on that.”` and continues degraded.
- **Depends on:** WU-TURN-02.
- **Files touched:** `src/mockrill/voice/turnController.ts` (EDIT), `tests/mockrill/voice/thinking.test.ts` (CREATE).
- **Numbered implementation steps:**
  1. Implement `handleFinal` per §5 A4: capture `tFinalMs = performance.now()`, `setState("thinking")`, build `TurnRequest`, race `deps.nextAction(req)` vs `setTimeout(THINKING_TIMEOUT_MS)` 12000.
  2. On timeout win: build `bridgeAction` with `say:"Let me follow up on that."`, `question: firstRemainingQuestion()` (if `asked.length < MAX_QUESTIONS` else null), `degraded:true`, emit `question-asked` with `latency_ms: THINKING_TIMEOUT_MS` and `degraded:true`, `setState("speaking")`, `mic.setMuted(true)`, `await speaker.speak(bridgeAction.say)`, `setState("listening")`, `mic.setMuted(false)`, `client.updateConfiguration`.
  3. On action win: clear timeout, handle `done:true→scoring` and `question→speaking` per §5 A4, cap `asked.length >= MAX_QUESTIONS` forces `done=true`.
  4. Catch `nextAction` rejection → treat as degraded bridge (same say string or catch branch returns that action).
  5. At most ONE `nextAction` per `onFinal`; guard with `if (state!=="thinking") return` re-entrance check.
  6. Create test `tests/mockrill/voice/thinking.test.ts` that fakes `nextAction` to never resolve (hang) and asserts bridge line spoken after 12 s (use `vi.useFakeTimers` and advance 12000):
     ```ts
     import { describe, it, expect, vi } from "vitest";
     import { createTurnController } from "src/mockrill/voice/turnController.js";
     it("thinking timeout bridge", async ()=>{
       vi.useFakeTimers();
       const spoken:string[]=[];
       const speaker:any={available:true, speaking:false, speak: async (t:string)=>{ spoken.push(t); }, cancel:()=>{}};
       const mic:any={onChunk:()=>{}, setMuted:()=>{}, stop:()=>{}};
       const bus:any={emit: vi.fn(), subscribe:()=>()=>{}, snapshot:()=>[], reset:()=>{}};
       const client:any={state:"open", sendAudio:()=>{}, updateConfiguration:()=>{}, forceEndpoint:()=>{}, terminate: async ()=>{}, connect: async ()=>{}};
       const c=createTurnController({mic,client,speaker,bus,nextAction: ()=> new Promise(()=>{})}); // never resolves
       (c as any)._testSetState?.("listening");
       const p = (c as any)._testHandleFinal({turn_order:0, transcript:"answer", formatted:true, end_of_turn:true, end_of_turn_confidence:0.9, words:[{text:"answer",start:0,end:100,confidence:0.9,word_is_final:true}], speaker:"candidate", received_at:new Date().toISOString()});
       await vi.advanceTimersByTimeAsync(12000);
       await p;
       expect(spoken[0]).toBe("Let me follow up on that.");
       vi.useRealTimers();
     });
     ```
- **Verification command:**
  ```sh
  npx vitest run tests/mockrill/voice/thinking.test.ts
  ```
- **Expected output:**
  ```
   ✓ tests/mockrill/voice/thinking.test.ts (1 test)
  Test Files  1 passed (1)
       Tests  1 passed (1)
  ```
- **Done-when:** Timeout at exactly 12000 ms speaks literal `Let me follow up on that.` and returns to `listening` without throwing.

### WU-TURN-05 — `drill()` re-entry without reconnecting

- **Goal:** Implement `drill(questionId)` that re-drills weakest answer in same WebSocket session.
- **Depends on:** WU-TURN-02, WU-TURN-04 (score replacement).
- **Files touched:** `src/mockrill/voice/turnController.ts` (EDIT), `tests/mockrill/voice/drill.test.ts` (CREATE).
- **Numbered implementation steps:**
  1. Add `drillAttempts = new Map<string,number>()` and `scoresByQuestionId = new Map<string,AnswerScore>()` closures; expose `storeScore` per §5 A7 that replaces on duplicate `question_id`.
  2. Implement `async drill(questionId:string)` per §5 A5 steps 1-14: guard states (allow from `complete`/`scoring`/`listening`/`speaking` — otherwise no-throw return), lookup question (from `askedQuestionsMap` built during session or from injected `questionBank` if provided via deps), compute `attempt = (drillAttempts.get(qId)??0)+1`, find `weakestAxis` from prior score (min axes, tie→structure, or specificity if no prior), build framingLine literal `Let's revisit that. For "${question.text}" — focus on ${weakestAxis}. Take another pass.`, emit `drill-start` with `{question_id:questionId, attempt}`, `setState("speaking")`, `mic.setMuted(true)`, `await speaker.speak(framingLine)`, `setState("listening")`, `mic.setMuted(false)`, `client.updateConfiguration({agent_context:`drill:${questionId}:attempt=${attempt}`})` — **do NOT call `client.connect()`**.
  3. Assert in code comment: `// socket stays open — drill does NOT reconnect; this is what makes re-drill in same session true`.
  4. In `handleFinal` after drill, `storeScore` overwrites prior `AnswerScore` for that `question_id` (not push duplicate).
  5. Create test `tests/mockrill/voice/drill.test.ts`:
     ```ts
     import { describe, it, expect, vi } from "vitest";
     import { createTurnController } from "src/mockrill/voice/turnController.js";
     it("drill does not reconnect", async ()=>{
       const bus:any={emit: vi.fn(), subscribe:()=>()=>{}, snapshot:()=>[], reset:()=>{}};
       const speaker:any={available:true, speaking:false, speak: async ()=>{}, cancel:()=>{}};
       const mic:any={onChunk:()=>{}, setMuted:()=>{}, stop:()=>{}};
       const connectSpy = vi.fn(async ()=>{ client.state="open"; });
       const client:any={state:"closed", sendAudio:()=>{}, updateConfiguration: vi.fn(), forceEndpoint:()=>{}, terminate: async ()=>{}, connect: connectSpy};
       const c=createTurnController({mic,client,speaker,bus,nextAction: async ()=>({say:"next",question:{id:"q1",text:"Q1",competency:"behavioral",difficulty:1,follow_ups:[],keyterms:[]},score:null,done:false,degraded:false}) as any});
       // start to open socket
       await c.start(); expect(connectSpy).toHaveBeenCalledTimes(1);
       (c as any)._testSetState?.("complete");
       // seed a question so drill can find it
       (c as any)._testSeedQuestion?.({id:"q1",text:"Tell me about a challenge",competency:"behavioral",difficulty:1,follow_ups:[],keyterms:[]}, {question_id:"q1", turn_order:0, axes:{structure:2,specificity:1,clarity:3,relevance:2}, overall:2, rationale:"weak", evidence:[], source:"deterministic"});
       await c.drill("q1");
       expect(connectSpy).toHaveBeenCalledTimes(1); // NOT called again
       expect(bus.emit).toHaveBeenCalledWith(expect.objectContaining({step_id:"drill-start"}));
     });
     ```
  6. Ensure test also checks score replacement: second score for same `q1` replaces first in `scoresByQuestionId`.
- **Verification command:**
  ```sh
  npx vitest run tests/mockrill/voice/drill.test.ts
  ```
- **Expected output:**
  ```
   ✓ tests/mockrill/voice/drill.test.ts (1 test)
  Test Files  1 passed (1)
       Tests  1 passed (1)
  ```
- **Done-when:** `drill()` emits `drill-start` with incremented `attempt`, speaks framing line, does NOT call `client.connect()`, and score replacement works.

### WU-TURN-06 — `latency_ms` instrumentation (NFR-06)

- **Goal:** Measure `performance.now()` delta from `onFinal` to `speak()` start and log as `latency_ms` in `question-asked` envelope payload.
- **Depends on:** WU-TURN-02, WU-TURN-04.
- **Files touched:** `src/mockrill/voice/turnController.ts` (EDIT), `tests/mockrill/voice/latency.test.ts` (CREATE).
- **Numbered implementation steps:**
  1. In `handleFinal`, at entry capture `tFinalMs = performance.now()` (or `Date.now()` fallback if `performance` undefined: `const now = typeof performance!=="undefined"? performance.now(): Date.now()`).
  2. Just before `speaker.speak(action.say)` in T7, capture `tSpeakStart = performance.now()` and compute `latency_ms = Math.round(tSpeakStart - tFinalMs)`.
  3. Emit `bus.emit(makeEnvelope("question-asked","started",{question: action.question, spoken: action.say, latency_ms} as any))` — `latency_ms` is number, not string. For timeout bridge path, use `THINKING_TIMEOUT_MS` as value.
  4. Document in file comment: `// NFR-06: end_of_turn -> speak start ≤2.0s p50; measured via performance.now() delta logged as latency_ms; demonstrable on stage by filtering question-asked envelopes.`
  5. Create test `tests/mockrill/voice/latency.test.ts`:
     ```ts
     import { describe, it, expect, vi } from "vitest";
     import { createTurnController } from "src/mockrill/voice/turnController.js";
     it("logs latency_ms", async ()=>{
       const envelopes:any[]=[];
       const bus:any={emit:(e:any)=> envelopes.push(e), subscribe:()=>()=>{}, snapshot:()=>[], reset:()=>{}};
       const speaker:any={available:true, speaking:false, speak: async (t:string)=>{}, cancel:()=>{}};
       const mic:any={onChunk:()=>{}, setMuted:()=>{}, stop:()=>{}};
       const client:any={state:"open", sendAudio:()=>{}, updateConfiguration:()=>{}, forceEndpoint:()=>{}, terminate: async ()=>{}, connect: async ()=>{}};
       const c=createTurnController({mic,client,speaker,bus,nextAction: async ()=>({say:"Next question?",question:{id:"q2",text:"Next?",competency:"technical",difficulty:2,follow_ups:[],keyterms:[]},score:null,done:false,degraded:false}) as any});
       (c as any)._testSetState?.("listening");
       const turn={turn_order:0, transcript:"my answer", formatted:true, end_of_turn:true, end_of_turn_confidence:0.9, words:[{text:"my",start:0,end:100,confidence:0.9,word_is_final:true}], speaker:"candidate", received_at:new Date().toISOString()};
       await (c as any)._testHandleFinal(turn);
       const qa = envelopes.find(e=>e.step_id==="question-asked");
       expect(qa).toBeDefined();
       expect(typeof qa.payload.latency_ms).toBe("number");
       expect(qa.payload.latency_ms).toBeGreaterThanOrEqual(0);
       expect(qa.payload.latency_ms).toBeLessThan(2000); // p50 budget; in test should be small
     });
     ```
- **Verification command:**
  ```sh
  npx vitest run tests/mockrill/voice/latency.test.ts
  ```
- **Expected output:**
  ```
   ✓ tests/mockrill/voice/latency.test.ts (1 test)
  Test Files  1 passed (1)
       Tests  1 passed (1)
  ```
- **Done-when:** Every `question-asked` envelope emitted from `thinking→speaking` contains numeric `latency_ms` derived from `performance.now()` delta.

### WU-TURN-07 — `engine/voice/policy.md` (replaces stub)

- **Goal:** Author prose policy document for judges and Q&A sheet covering turn-end, barge-in, mute, latency, hard stop, drill.
- **Depends on:** WU-TURN-02 through WU-TURN-06 (policy documents behavior implemented in those WUs).
- **Files touched:** `engine/voice/policy.md` (CREATE), `engine/voice/policy.todo.md` (DELETE).
- **Numbered implementation steps:**
  1. Delete `engine/voice/policy.todo.md` (rm file; do not leave stub).
  2. Create `engine/voice/policy.md` with exactly these headings in order:
     ```md
     # Mockrill Voice Policy — Turn-Taking, Barge-In & Output
     ## Turn End Detection
     ## Barge-In Rule
     ## Mute Discipline
     ## Latency Budget
     ## Hard Stop & Degradation
     ## Drill (Re-Drill in Same Session)
     ```
  3. Under `Turn End Detection`: state AssemblyAI `Turn` with `end_of_turn` + `turn_is_formatted` + `end_of_turn_confidence` 0.45; only `end_of_turn===true && turn_is_formatted===true` → `onFinal` → `thinking`; `turn_is_formatted===false` is still partial; routing table.
  4. Under `Barge-In Rule`: both triggers verbatim: ≥3 words on partial while speaking, and 3 consecutive PCM peaks >0.15; amplitude = max abs Int16 /32767; `BARGE_IN_MIN_WORDS=3`, `BARGE_IN_PEAK=0.15`.
  5. Under `Mute Discipline`: mic muted entire `speaking`, `setMuted(true/false)` per state, echo-cancellation note that barge-in via partial only works when browser lets speech through despite muting, hence amplitude fallback.
  6. Under `Latency Budget`: NFR-06 2.0 s p50, measured `performance.now()` at `onFinal` and at `speak()` start, delta `latency_ms` in `question-asked`; demonstrable on stage by filtering envelopes and computing median.
  7. Under `Hard Stop & Degradation`: `MAX_SESSION_MS=900000` (15 min) hard stop via `setTimeout` forcing `session-end` with `max_session_exceeded`; `THINKING_TIMEOUT_MS=12000` bridge line `Let me follow up on that.` degraded continuation; never-throw NFR-02.
  8. Under `Drill`: `drill(questionId)` emits `drill-start` with incremented `attempt`, speaks `Let's revisit that. For "..." — focus on {axis}. Take another pass.`, re-enters `speaking→listening` without `client.connect()`, socket stays open, prior `AnswerScore` replaced.
  9. Keep tone prose for judges; include literal constants and `rate:1.05` note.
  10. Verify `engine/voice/policy.todo.md` no longer exists.
- **Verification command:**
  ```sh
  ls engine/voice/policy.md && ! test -f engine/voice/policy.todo.md && echo "policy OK" && grep -q "BARGE_IN_MIN_WORDS" engine/voice/policy.md && echo "barge-in documented"
  ```
- **Expected output:**
  ```
  engine/voice/policy.md
  policy OK
  barge-in documented
  ```
- **Done-when:** `engine/voice/policy.md` exists with 6 headings and mentions `BARGE_IN_MIN_WORDS`, `BARGE_IN_PEAK`, `MAX_SESSION_MS`, `THINKING_TIMEOUT_MS`, `latency_ms`, and `policy.todo.md` is gone.


## §10 Acceptance criteria

| # | Requirement | Satisfied by | Check |
|---|---|---|---|
| R-TURN-01 | createSpeaker uses only speechSynthesis, no vendor | WU-TURN-01 | File contains `speechSynthesis` and no TTS SDK import; `available` literal check |
| R-TURN-02 | available literal + fallback contract | WU-TURN-01 | `available === typeof window !== "undefined" && "speechSynthesis" in window`, speak resolves immediately when false |
| R-TURN-03 | Voice selection Google→en→first + 1500 ms wait | WU-TURN-01 | Code has `name.includes("Google")`, `lang.startsWith("en-")`, `voiceschanged`, `1500` |
| R-TURN-04 | speak never-reject (end/error/watchdog 30s), cancel resolves pending | WU-TURN-01 | `onend`/`onerror` both `resolve`, `setTimeout 30000`, `speechSynthesis.cancel()` |
| R-TURN-05 | Fixed rate 1.05 pitch 1.0 volume 1.0 | WU-TURN-01 | Literal values and comment "slightly brisk" |
| R-TURN-06 | State machine 11-row table over SessionState | WU-TURN-02 | Transition table comment + `setState` + `SessionState` import; vite-node prints 6-state walk |
| R-TURN-07 | Constants BARGE_IN_MIN_WORDS=3, MAX_QUESTIONS=4, MAX_SESSION_MS=900000, THINKING_TIMEOUT_MS=12000, BARGE_IN_PEAK=0.15 | WU-TURN-02/03/04/06 | Each exported as const with literal value |
| R-TURN-08 | Mute discipline entire speaking | WU-TURN-03 | `mic.setMuted(true)` in speaking, false in listening, comment present |
| R-TURN-09 | Barge-in word-count ≥3 while speaking | WU-TURN-03 | `handlePartial` checks `words.length >=3`, cancels speaker |
| R-TURN-10 | Barge-in amplitude 3× peak >0.15 | WU-TURN-03 | `computePeak` = maxAbs/0x7FFF, 3 consecutive check |
| R-TURN-11 | onFinal → thinking, mic muted, transcript-final, nextAction once | WU-TURN-04 | `handleFinal` steps |
| R-TURN-12 | thinking→speaking (question) / →scoring (done) with envelopes + speak | WU-TURN-04 | Emits question-asked/answer-scored/scorecard-ready, calls speaker.speak |
| R-TURN-13 | drill() without reconnect, framing line, replace score | WU-TURN-05 | Emits drill-start, speaks framing line, no client.connect, replaces AnswerScore |
| R-TURN-14 | Latency NFR-06 performance.now() → latency_ms in question-asked | WU-TURN-06 | `tFinalMs`/`tSpeakStart` delta, envelope payload contains latency_ms number |
| R-TURN-15 | Nothing throws to UI (NFR-02) | WU-TURN-01–06 | Every async boundary try/catch, speak never rejects, degraded emits |
| R-TURN-16 | MAX_SESSION_MS hard stop | WU-TURN-02 | setTimeout 900000 → stop/failed |
| R-TURN-17 | engine/voice/policy.md with 6 headings | WU-TURN-07 | File exists, todo deleted, contains constants |

## §11 Non-goals

- No AssemblyAI StreamingClient or mic capture implementation — owned by DP-AAI-STREAM (M16–M19); this plan only consumes `StreamingClient`/`MicSource` as injected deps.
- No LLM Gateway, tool descriptors, or question-bank logic — owned by DP-INTERVIEWER; this plan calls `nextAction` as opaque `fetch("/api/turn")` injection with ≤1 call per turn.
- No filler lexicon, evidence quoting, deterministic rubric, or scorecard building — owned by DP-SCORECARD; this plan only transitions to `scoring` and emits `scorecard-ready`.
- No React components, event-bus implementation, or `useMockrillEvents` hook — owned by DP-UI; this plan emits `EventEnvelope`s via injected `bus`.
- No deployment, health check, or vercel.json — owned by DP-DEPLOY.
- No golden fixture or mock-publish SSE server — owned by DP-DEMOPROOF.
- No new vendor TTS, no second API key, no `localStorage`-dependent behavior, no SDK — browser `speechSynthesis` only.

## §12 Open questions

| # | Question | Blueprint gap? | Safe default chosen in this plan (inside own namespace) |
|---|---|---|---|
| Q1 | Should `question-asked` payload include `latency_ms` when `StepPayloads` M11 does not list it? | Yes — M11 defines `question-asked: {question, spoken}` with no latency | Extend payload as `{question: InterviewQuestion, spoken: string, latency_ms: number}` via intersection / `as any` cast for envelope; document as `Optional latency_ms:number for NFR-06 observability`; no schema break because payload is `Record<string,unknown>` at transport layer |
| Q2 | Is `drill()` allowed to be called before `complete`? | Blueprint says "in same session" after scorecard but not explicit | Allow from `complete`, `scoring`, `listening`, `speaking`; otherwise no-op never throws; safest for UI button |
| Q3 | Voices may never load (`getVoices()` stays empty) — should `speak` wait forever? | No spec | Wait 1500 ms then fallback to no voice (browser default); do not block speak beyond that |
| Q4 | What if `performance.now()` is unavailable (old browser, Node test)? | No spec | Fallback to `Date.now()` delta; still numeric `latency_ms`; tests use `performance.now()` mock if present |
| Q5 | Should amplitude barge-in use Int16 or Float32 peak? | Spec mentions PCM chunk peak 0.15 | Implement Int16 path `maxAbs/0x7FFF`; if Float chunk ever arrives, use `Math.abs(s)` directly (both 0..1 range); 3 consecutive rule same |
| Q6 | Enforce `MAX_QUESTIONS=4` — what if LLM returns 5th question? | Spec says max 4 | Cap in `handleFinal`: if `asked.length >=4`, force `done=true` and route to scoring instead of speaking 5th question |
| Q7 | Bridge line locale — is `"Let me follow up on that."` final? | Spec gives literal | Use exactly that string; no i18n |
| Q8 | `speechSynthesis` voice `lang` case sensitivity | No spec | Use `lang.startsWith("en-")` exact; `name.includes("Google")` case-sensitive as browsers expose "Google" capitalized |

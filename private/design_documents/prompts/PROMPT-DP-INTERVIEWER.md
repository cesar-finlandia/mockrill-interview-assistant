# PROMPT-DP-INTERVIEWER — author the design plan for the interviewer engine

**Operator:** paste nothing else. Reading this file IS the task.

**You are** a principal engineer authoring ONE chassis-format design plan. You do
not write code. Your single output is the file
`private/design_documents/design_plans/DP-INTERVIEWER.md`.

## YOUR PLAN: DP-INTERVIEWER — LLM Gateway Tool-Calling & Question Policy

This plan owns the brain: the question bank, the dialogue policy, the three
JSON-Schema tools, the AssemblyAI LLM Gateway client, the conversation buffer,
and the `POST /api/turn` serverless route. The brief's Path A bullet
"**JSON-Schema tool calling**" is satisfied here — via the LLM Gateway, on the
same `ASSEMBLYAI_API_KEY` — so this plan is primary evidence for the
"Application of Technology" axis.

### What your plan must own (rows M24–M29)

**M25 `src/mockrill/engine/tools.ts`** — write out the three tool descriptors in
full, as literal OpenAI-format objects. Every `parameters` block must be a
complete JSON Schema with `type`, `properties`, `required`, `additionalProperties: false`,
and per-property `description` strings:

- `select_question` → `{ question_id: string; rationale: string; is_follow_up: boolean }`
- `score_answer` → `{ structure: integer 0-5; specificity: integer 0-5; clarity: integer 0-5; relevance: integer 0-5; rationale: string; quotes: [{ text: string; why: string }] }`
- `tag_filler` → `{ words: string[] }` (advisory only — deterministic detection in
  DP-SCORECARD is authoritative; the LLM's answer is used only to *extend* the
  lexicon at runtime, never to replace it. State this precedence explicitly.)

`MOCKRILL_TOOLS` is the frozen array of all three.

**M26 `src/mockrill/engine/llmGateway.ts` → `chatCompletion`.** Spell out:
1. Endpoint `https://llm-gateway.assemblyai.com/v1/chat/completions`, headers
   `Authorization: <ASSEMBLYAI_API_KEY>` and `Content-Type: application/json`.
2. Body: `{ model, messages, tools: MOCKRILL_TOOLS, tool_choice: "auto", max_tokens: 700 }`.
3. `model` = `process.env.MOCKRILL_LLM_MODEL ?? "claude-sonnet-4-6"`;
   on a non-2xx or timeout, ONE retry against
   `process.env.MOCKRILL_LLM_FALLBACK_MODEL ?? "qwen3.5-4b-32k-fast"`.
   Both attempts sit inside the same `withResilience` wrapper
   (`timeout_ms: 15000, retries: 1, fallback_chain: { order: ["cache","none"] }`).
4. Tool-call parsing: `choices[0].message.tool_calls[]`; `function.arguments` is a
   **JSON string** and must be parsed inside a try/catch — a parse failure yields
   `makeDegradedResult({ reason: "llm_tool_arguments_unparseable", fallback_source: "none" })`,
   never a throw.
5. Server-side only. State that importing this file from browser code is a defect
   and that DP-UI must call `/api/turn` instead.

**M29 `engine/rag/question-bank.json`** — replaces the `corpus.todo.md` stub.
Specify: `{ version: "1.0.0", roles: { "junior-frontend": InterviewQuestion[], "junior-backend": InterviewQuestion[], "career-switcher": InterviewQuestion[] } }`,
**at least 6 questions per role**, each with 2–3 `follow_ups` and 3–6 `keyterms`
(the `keyterms` feed the streaming socket's `keyterms_prompt`, which is how the
STT is biased toward domain vocabulary — call this out, it is Application-of-
Technology evidence). Write the schema and at least two fully worked example
questions into the plan; instruct the implementor to fill the rest by the same
pattern, and give the exact acceptance count so "enough" is not a judgment call.

**M24 `src/mockrill/engine/types.ts`** — `TurnRequest` and `InterviewerAction`
exactly as in S7. These must match `engine/schema/input.schema.json` and
`output.schema.json` (owned by DP-CONTRACTS) field for field; state that the
verification for this work unit validates a sample `TurnRequest` against the real
schema file.

**M28 `engine/agents/index.ts` → `callInterviewer`** — replaces the
`TODO(ENGINE)` stub. Keep the existing `withResilience` wrapper and its config;
replace only the inner body.

**M27 `api/turn.ts`** — `POST /api/turn`. Rules:
- Always responds `200` with an `InterviewerAction`. Never 4xx/5xx for a
  legitimate request; failures return `{ say: <a safe bridging line>, question: null, score: null, done: false, degraded: true }`.
- Method other than POST → 405.
- Body larger than 64 KB → truncate `last_turn.words` to the first 400 entries
  before processing (state the exact number).
- Reads `ASSEMBLYAI_API_KEY` from the environment; never echoes it.

### The dialogue policy algorithm (write it as numbered steps, no judgment calls)

1. Build the `Message[]` buffer: a pinned system message from
   `engine/prompts/system.interviewer.md`, then one `user`/`assistant` pair per
   prior turn.
2. Fit it with `fit(buffer, { model_profile: "<the profile id you choose>",
   reserved_output: 1024, strategy: "sliding-window-pinned", warning_threshold: 0.8 })`
   from `src/context`. State which `model_profile` key you use and that it must
   exist in `config/model-profiles.json`; if it does not, name the safe default
   and say the implementor must verify the file rather than invent a key.
3. Call `chatCompletion` **once**.
4. If a `select_question` tool call came back, resolve `question_id` against the
   question bank; if the id is unknown, fall to step 6.
5. If a `score_answer` tool call came back, build an `AnswerScore` with
   `source: "llm"` and merge it with the deterministic score using `mergeScores`
   from `src/mockrill/scoring` (owned by DP-SCORECARD — **import it, do not
   re-implement scoring**).
6. Deterministic fallback when there is no usable tool call, the response is
   degraded, or the key is missing: pick the next unasked question from the bank
   in bank order, score the last turn with `scoreAnswerDeterministic`, and return
   `degraded: true`. **The interview must always be able to run end-to-end with
   zero LLM availability.** State this as an acceptance criterion.
7. `done` becomes `true` after `MAX_QUESTIONS` (4) answered questions, matching
   DP-TURNTAKING's constant. Note the duplication and state that DP-TURNTAKING
   owns the constant and this plan reads it from `src/mockrill/contracts` if it
   is moved there — otherwise both plans hard-code 4 and the plan says so
   explicitly.

### Prompts

`engine/prompts/system.interviewer.md` and `engine/prompts/user.turn.md` replace
the `.todo.md` stubs. Write the **complete** system prompt text into the plan —
not a description of it. It must: set the persona (a friendly but unsentimental
technical screener), cap replies to two short sentences (long TTS output kills
the pacing), forbid the model from inventing the candidate's words, and require
it to call `select_question` and `score_answer` rather than answering in prose.

### Mandatory work units (at least these)

1. `WU-INT-01` — `src/mockrill/engine/types.ts` (M24) + schema-match verification.
2. `WU-INT-02` — `engine/prompts/*.md` (full text).
3. `WU-INT-03` — `engine/rag/question-bank.json` (M29) with the stated minimum counts.
4. `WU-INT-04` — `src/mockrill/engine/tools.ts` (M25).
5. `WU-INT-05` — `src/mockrill/engine/llmGateway.ts` (M26) incl. degraded parsing.
6. `WU-INT-06` — the dialogue policy function, verified with a stubbed gateway.
7. `WU-INT-07` — the zero-LLM deterministic path end-to-end.
8. `WU-INT-08` — `engine/agents/index.ts` (M28).
9. `WU-INT-09` — `api/turn.ts` (M27).

At least one verification command must import the real `mergeScores` and
`scoreAnswerDeterministic` from `src/mockrill/scoring` and the real
`TranscriptTurn` from `src/mockrill/contracts`, then print the resulting
`AnswerScore.overall` and `source`, with the exact expected stdout in the plan.


---

## SHARED CONTEXT (identical in every PROMPT-DP-*.md — everything you need is here)

### S1. The event, verbatim where it is binding

2026-09 **AssemblyAI Voice Agent Hackathon** on lablab.ai. Sep 1 → **Wed 2026-09-30
15:00 UTC** (internal target Wed 2026-09-24 15:00 UTC). $10,000 pool: **5 winners,
each $1,000 cash + $1,000 AssemblyAI credits.**

**Mandatory technology (verbatim):**
> "Every participant builds on AssemblyAI."
> "Build a voice agent using AssemblyAI's real-time voice AI technology. Choose the approach that fits your idea and how much of the voice stack you want to build yourself."
> "Path A — Voice Agent API (end-to-end, one connection) … • Speech-to-text powered by Universal-3 Pro • LLM routing and voice output • Turn-taking and voice activity detection • JSON-Schema tool calling"
> "Path B — Realtime Speech-to-Text API (bring your own orchestration) … • Real-time speech-to-text over WebSocket • Sub-second transcription • Multilingual speech recognition • Bring your own LLM and text-to-speech"

AssemblyAI is the ONLY mandated technology. Path A and Path B are equal
alternatives. The single runtime secret is `ASSEMBLYAI_API_KEY`.

**Prize tracks (verbatim):** "Tracks: TBA / Announced soon"; "Sponsor sub-prizes —
None listed — `sponsors: []`, `eventPrizes: []`". There is **one flat ranking with
five equal winners and no side tracks**. Design for the four judging axes, not for
a track.

**Judging axes (weights unpublished; assume equal quarters):** Application of
Technology · Presentation · Business Value · Originality.

**Submission gate (10 fields):** 1 title · 2 short description · 3 long
description · 4 tech/category tags · 5 cover image **PNG/JPG 16:9** · 6 video
**MP4, 3–5 min** · 7 slides **PDF** · 8 **public GitHub repo** · 9 hosting
platform · 10 **Application URL** (required for interactive evaluation).
Submissions must be **original and MIT-compliant**.

**Bonus:** none published — no bonus integrations, not worth track dilution.

### S2. The product

**Mockrill — Realtime AI Mock-Interview Voice Coach.** Junior bootcamp graduates
and career switchers rehearse spoken technical screening calls. A voice
interviewer asks role-specific questions with real turn-taking and barge-in,
then returns an **evidence-backed scorecard that quotes exact spoken moments**
("at 07:42 you said 'kind of' 3× before answering") and **re-drills the weakest
answer by voice in the same session**. Business model: B2C subscription +
B2B licensing to bootcamp career services. Why AI/why now: only a realtime voice
agent can observe the spoken behavior it claims to coach.

### S3. Repository and hard constraints

You are working in the **assembled working copy** `hackathon-entries/2026-09-assemblyAI`.

`assembly.manifest.json` INCLUDES: `resilience`, `platform`, `ideation`,
`context`, `provenance`.
It EXCLUDES: `media`, `dev-tooling`, `assembly-advisory`, `data`, `cost`, `pgm`,
`profile`.

**Binding constraints — a plan that violates any of these is rejected:**

1. **Chassis is read-only.** Never create, edit or delete anything under
   `src/resilience/`, `src/platform/`, `src/context/`, `src/ideation/`,
   `src/provenance/`, `contracts/`, or `assembly.manifest.json`.
2. **Excluded modules do not exist.** `src/media` (`withStt`/`withTts`),
   `src/cost` (`with_cost_guardrail`), `src/dev` (`mock`/`eval`/`doctor`/`track`),
   `src/pgm`, `src/profile`, `src/assembly` are NOT in this working copy.
   Never import them. Older walkthrough docs that reference them are superseded.
   In particular `scripts/mock-publish.ts` does **not** exist.
3. New code lives only in `engine/`, `src/mockrill/`, `api/`, `scripts/`,
   `fixtures/`, `tests/mockrill/`, `docs/`, and the repo-root config files named
   in your plan.
4. **Every** outbound network call is wrapped with `withResilience` from
   `src/resilience` using `{ timeout_ms: 15000, retries: 1, fallback_chain: { order: ["cache", "none"] } }`.
   Nothing throws to the UI; failures become `DegradedResult`.
5. Node ≥ 20, TypeScript **strict**, ESM, `moduleResolution: NodeNext`,
   `noUncheckedIndexedAccess: true`. Chassis imports use the barrel path only
   (`import { withResilience } from "src/resilience";`) — deep imports are
   CI-blocked. The `src/*` alias is configured in `tsconfig.json` and `vite.config.ts`.
6. Prefer deterministic code to an extra LLM call. At most ONE LLM Gateway
   request per candidate turn.
7. Exactly one runtime secret, `ASSEMBLYAI_API_KEY`, read **only** inside
   `api/*.ts` (server side). It must never reach the browser bundle.
8. No `localStorage`-dependent core behavior, no new vendor SDK, no second API key.

### S4. Architecture (binding)

**Shipped hosted path = Path B**: browser captures mic → **browser connects
directly** to `wss://streaming.assemblyai.com/v3/ws` with a short-lived token
minted by a serverless function → turns come back with word-level timestamps →
the orchestration LLM is **AssemblyAI's own LLM Gateway** (OpenAI-compatible,
same key) called from a serverless function with **JSON-Schema tool calling** →
voice output is the browser's built-in `window.speechSynthesis` (no TTS vendor,
no second key). Deployment is Vercel: static Vite bundle + three stateless
functions. **Audio never proxies through a serverless function** — Vercel cannot
hold long-lived sockets.

```
BROWSER: mic(AudioWorklet, PCM s16le 16 kHz, 200 ms) ─► StreamingClient ─► wss://streaming.assemblyai.com/v3/ws
                                                              │
                          TurnController (state machine) ◄────┘ Begin/Turn/Termination
                                │            │
                    speechSynthesis      MockrillEventBus ─► useMockrillEvents() ─► React screens
                                │                                 (chassis UI components)
                                └─► POST /api/turn ─► LLM Gateway (tools) ─► InterviewerAction
SERVERLESS: GET /api/aai-token · POST /api/turn · GET /api/health   (hold ASSEMBLYAI_API_KEY)
OFFLINE:    scripts/mockrill-mock-publish.ts ─SSE─► chassis useEventStream() ─► same screens
```

### S5. Verified AssemblyAI API facts (verified 2026-09-01 — use these; never invent others)

**Temporary token:** `GET https://streaming.assemblyai.com/v3/token`
· header `Authorization: <ASSEMBLYAI_API_KEY>` (no `Bearer`)
· query `expires_in_seconds` (required, 1–600); `max_session_duration_seconds`
  (optional, 60–10800, default 10800)
· 200 → `{ "token": string, "expires_in_seconds": number }`
· errors 400/401/429/500 → `{ error, code?, details? }`

**Streaming socket:** `wss://streaming.assemblyai.com/v3/ws`
· browser auth: `?token=<temp token>`; server auth: `Authorization` header
· `speech_model` default `universal-3-5-pro` (also `universal-streaming-english`,
  `universal-streaming-multilingual`)
· `sample_rate` 8000–96000 default **16000**
· `encoding` `pcm_s16le` (default) | `pcm_mulaw` | `opus` | `ogg_opus` | `aac`
· `format_turns` bool default false · `end_of_turn_confidence_threshold` 0–1 default 0.4
· `min_turn_silence` 50–10000 ms · `max_turn_silence` default 1536 ms
· `vad_threshold` 0–1 default 0.2 · `interruption_delay` 0–1000 ms
· `mode` `max_accuracy | min_latency | balanced` · `keyterms_prompt` array[string]
· `prompt` / `agent_context` string ≤1750 chars · `session_heartbeat` bool
· audio: **binary frames**, PCM s16le 16 kHz mono, 50–1000 ms per message
  (recommended 160–200 ms)
· server→client `{"type":"Begin","id","expires_at","configuration":{...}}`
· server→client `{"type":"Turn","turn_order","turn_is_formatted","end_of_turn",
  "transcript","utterance","end_of_turn_confidence",
  "words":[{"text","start","end","confidence","word_is_final"}]}`
  — `start`/`end` are **milliseconds from session start**
· server→client `{"type":"Termination","audio_duration_seconds","session_duration_seconds"}`
· client→server `{"type":"Terminate"}` · `{"type":"ForceEndpoint"}` ·
  `{"type":"UpdateConfiguration", ...}` (updatable includes `agent_context`,
  `keyterms_prompt`, `min_turn_silence`, `max_turn_silence`,
  `end_of_turn_confidence_threshold`, `vad_threshold`, `interruption_delay`, `mode`)
· billing is on total socket-open duration; auto-closes after 3 h — always `Terminate`.

**LLM Gateway:** `POST https://llm-gateway.assemblyai.com/v1/chat/completions`
· headers `Authorization: <ASSEMBLYAI_API_KEY>`, `Content-Type: application/json`
· **OpenAI-compatible** body `{ model, messages, tools, tool_choice, max_tokens }`
· `tools[] = { "type":"function", "function": { "name", "description", "parameters": <JSON Schema> } }`
· response `{ "choices":[{ "message": { "role":"assistant", "content"?, "tool_calls":[
  { "id", "type":"function", "function": { "name", "arguments": "<JSON string>" } } ] },
  "finish_reason" }], "request_id" }`
· **binding model choice:** primary `claude-sonnet-4-6`, fallback
  `qwen3.5-4b-32k-fast` (env `MOCKRILL_LLM_FALLBACK_MODEL`).

### S6. Chassis contracts you may import (read-only, exact signatures)

```ts
// src/resilience
withResilience<T>(fn: () => Promise<T>, config?: ResilienceConfig, deps?): () => Promise<T | DegradedResult<T>>
withResilienceSync<T>(fn, config?, deps?): () => T | DegradedResult<T>
withValidation<T>(fn, schema: object, config?, deps?): () => Promise<T | DegradedResult<T>>
isDegradedResult(v: unknown): v is DegradedResult
makeDegradedResult<T>(input: { reason: string; fallback_source: "secondary_provider"|"cache"|"replay"|"none"; original_error?: string|null; data?: T|null }): DegradedResult<T>
createGoldenCache(rootDir?: string): GoldenCache
type DegradedResult<T=unknown> = { degraded: true; reason: string; fallback_source: "secondary_provider"|"cache"|"replay"|"none"; original_error: string|null; data: T|null; timestamp: string; version: "1.0.0" }
type ResilienceConfig = { timeout_ms?: number; retries?: number; backoff?: {...}; fallback_chain?: { order?: ("secondary_provider"|"cache"|"replay"|"none")[]; ... }; cache_key_strategy?: "auto"|"explicit"; cache_key_explicit?: string; forced_degraded?: boolean }
interface GoldenCache { get(key): Promise<unknown|null>; put(key, value, meta?): Promise<void>; has(key): Promise<boolean>; delete(key): Promise<boolean>; list(): Promise<Record<string, ListEntry>>; clear(): Promise<void>; deriveKey(input: {provider:string;model:string;prompt:unknown}|{explicitKey:string}): string }
// env kill switch: RES_FORCED_DEGRADED=1 → every wrapped call serves its golden cache entry
```

```ts
// src/platform/transport
type EventEnvelope = { step_id: string; status: "started"|"streaming"|"done"|"error"; payload: Record<string, unknown>; timestamp: string; sequence: number; trace_id?: string; degraded?: boolean }
createPublisher(transport?: "sse"|"websocket"): CollectablePublisher
  // .publish({stepId, status, payload?, traceId?, degraded?}): Promise<void>
  // .publishDelta(stepId, delta, index, traceId?): Promise<void>
  // .close(): Promise<void>; .collect(traceId?): FallbackSnapshot|null
  // .asSseStream(req: IncomingMessage, res: ServerResponse): void
useEventStream(opts?: SubscribeOptions): { envelopes: EventEnvelope[]; status: "connecting"|"open"|"closed"|"error"; error: Error|null; degraded: boolean; reconnect(): void }
type SubscribeOptions = { url?: string; traceId?: string; transport?: "sse"|"websocket"|"none"; fallback?: "auto"|"none"; apiBase?: string; onEnvelope?(e): void; onError?(e): void; onDegraded?(e): void }
```

```ts
// src/platform/ui
StreamingTextRenderer, StepStatusIndicator, CitationDisplay   // React components (envelope-only)
setTheme(id: "minimal"|"editorial"|"operator"): void; resolveTheme(v): ThemeId; currentTheme(): ThemeId
isDegradedEnvelope(env: EventEnvelope): boolean; degradedResultOf(env: EventEnvelope): DegradedResult|null
type Citation = { ... }  // read src/platform/ui/CitationDisplay.tsx for the exact props before using it
```

```ts
// src/context
fit(buffer: Message[], config?: Partial<ContextBudgetConfig>|null): { buffer: Message[]; status: BufferStatus }
append(buffer: Message[], message: Message, config?): { buffer: Message[]; status: BufferStatus }
count, countMessage, countBuffer, budget, calcStatus, calcBudget
type Message = { role: "system"|"user"|"assistant"|"tool"; content: string; metadata?: { timestamp?: string; pinned?: boolean; priority?: number; id?: string }; token_count?: number|null }
type ContextBudgetConfig = { model_profile: string; context_window?: number|null; reserved_output?: number; strategy?: "sliding-window-pinned"|"keep-last-n"|"extension-only"; strategy_options?: Record<string,unknown>; warning_threshold?: number; critical_threshold?: number; mutate?: boolean; compaction?: Record<string,unknown>|null }
type BufferStatus = { total_tokens: number; input_budget: number; utilization: number; truncated: boolean; evicted_count: number; warning: "none"|"approaching"|"exceeded"; rejected: boolean; reason?: string; strategy: string; model_profile: string }
```

CLIs (never import their internals; invoke them):
`npx vite-node src/provenance/provo/cli.ts generate|summary --manifest …`
`npx vite-node src/provenance/submit/cli.ts format|hygiene …`
`npx vite-node src/ideation/deckgen/cli.ts populate|diagram|validate …`
`npx vite-node src/ideation/script/cli.ts generate|validate …`
`npx vite-node src/ideation/faqdef/cli.ts generate|rehearse …`
`npx vite-node src/ideation/demodrive/cli.ts capture|validate …`
`npm run deploy` / `npm run deploy:verify` (polls `GET $PUBLIC_URL/health`).

### S7. The full inter-module contract table (SINGLE OWNER, N CONSUMERS)

Every entry-owned contract in this project, with its owning plan. **You may
create only the rows owned by YOUR plan. Every other row you need, you IMPORT
from the path shown. Re-declaring, re-typing, stubbing or copying a row you do
not own is a plan failure.**

| # | Owner | File | Export | Shape / signature |
|---|---|---|---|---|
| M1 | DP-CONTRACTS | `src/mockrill/contracts/types.ts` | `TranscriptWord` | `{ text: string; start: number; end: number; confidence: number; word_is_final: boolean }` (ms) |
| M2 | DP-CONTRACTS | `src/mockrill/contracts/types.ts` | `TranscriptTurn` | `{ turn_order: number; transcript: string; formatted: boolean; end_of_turn: boolean; end_of_turn_confidence: number; words: TranscriptWord[]; speaker: "candidate"\|"interviewer"; received_at: string }` |
| M3 | DP-CONTRACTS | `src/mockrill/contracts/types.ts` | `InterviewQuestion` | `{ id: string; text: string; competency: "behavioral"\|"technical"\|"situational"; difficulty: 1\|2\|3; follow_ups: string[]; keyterms: string[] }` |
| M4 | DP-CONTRACTS | `src/mockrill/contracts/types.ts` | `RubricAxis` | `"structure"\|"specificity"\|"clarity"\|"relevance"` |
| M5 | DP-CONTRACTS | `src/mockrill/contracts/types.ts` | `EvidenceQuote` | `{ kind: "filler"\|"quote"\|"pause"; text: string; start_ms: number; end_ms: number; label: string; note: string }` |
| M6 | DP-CONTRACTS | `src/mockrill/contracts/types.ts` | `FillerHit` | `{ word: string; start_ms: number; end_ms: number }` |
| M7 | DP-CONTRACTS | `src/mockrill/contracts/types.ts` | `AnswerScore` | `{ question_id: string; turn_order: number; axes: Record<RubricAxis, number>; overall: number; rationale: string; evidence: EvidenceQuote[]; source: "llm"\|"deterministic" }` |
| M8 | DP-CONTRACTS | `src/mockrill/contracts/types.ts` | `Scorecard` | `{ session_id: string; created_at: string; duration_ms: number; per_question: AnswerScore[]; overall: number; filler_total: number; filler_top: FillerHit[]; weakest_question_id: string\|null; degraded: boolean }` |
| M9 | DP-CONTRACTS | `src/mockrill/contracts/types.ts` | `SessionState` | `"idle"\|"connecting"\|"listening"\|"thinking"\|"speaking"\|"scoring"\|"complete"\|"failed"` |
| M10 | DP-CONTRACTS | `src/mockrill/contracts/steps.ts` | `MOCKRILL_STEP_IDS`, `MockrillStepId` | frozen tuple + union: `session-start`, `mic-capture`, `transcript-partial`, `transcript-final`, `question-asked`, `answer-scored`, `scorecard-ready`, `drill-start`, `session-end` |
| M11 | DP-CONTRACTS | `src/mockrill/contracts/steps.ts` | `StepPayloads` | mapped type: step id → payload shape |
| M12 | DP-CONTRACTS | `src/mockrill/contracts/envelope.ts` | `makeEnvelope` | `<K extends MockrillStepId>(stepId: K, status: EventEnvelope["status"], payload: StepPayloads[K], opts?: { traceId?: string; sequence?: number; degraded?: boolean }) => EventEnvelope` |
| M13 | DP-CONTRACTS | `src/mockrill/contracts/time.ts` | `formatTimestamp` | `(ms: number) => string` → `mm:ss`, zero-padded (`462000 → "07:42"`) |
| M14 | DP-CONTRACTS | `src/mockrill/contracts/index.ts` | barrel | re-exports M1–M13 |
| M15 | DP-CONTRACTS | `engine/schema/input.schema.json`, `engine/schema/output.schema.json` | JSON Schema | engine I/O |
| M16 | DP-AAI-STREAM | `api/aai-token.ts` | default handler | `GET /api/aai-token` → `200 { token, expires_in_seconds }` \| `503` degraded body |
| M17 | DP-AAI-STREAM | `src/mockrill/voice/mic.ts` | `createMicSource` | `(opts?: { sampleRate?: number }) => Promise<{ stream: MediaStream; onChunk(cb:(pcm: Int16Array)=>void): void; setMuted(m: boolean): void; stop(): void }>` |
| M18 | DP-AAI-STREAM | `src/mockrill/voice/streamingClient.ts` | `createStreamingClient` | `(opts: StreamingClientOptions) => StreamingClient` with `connect(): Promise<void\|DegradedResult<never>>`, `sendAudio(pcm: Int16Array): void`, `updateConfiguration(patch: Record<string,unknown>): void`, `forceEndpoint(): void`, `terminate(): Promise<void>`, `readonly state: "closed"\|"connecting"\|"open"` |
| M19 | DP-AAI-STREAM | `src/mockrill/voice/streamingClient.ts` | `StreamingClientOptions` | `{ tokenUrl?: string; speechModel?: string; keyterms?: string[]; onPartial(t: TranscriptTurn): void; onFinal(t: TranscriptTurn): void; onBegin(id: string): void; onTermination(s:{audio_duration_seconds:number;session_duration_seconds:number}): void; onDegraded(d: DegradedResult<unknown>): void }` |
| M20 | DP-AAI-STREAM | `src/mockrill/voice/index.ts` | barrel | re-exports M17–M19 **and** M21–M22 |
| M21 | DP-TURNTAKING | `src/mockrill/voice/speak.ts` | `createSpeaker` | `() => { speak(text: string): Promise<void>; cancel(): void; readonly speaking: boolean; readonly available: boolean }` |
| M22 | DP-TURNTAKING | `src/mockrill/voice/turnController.ts` | `createTurnController` | `(deps: TurnControllerDeps) => { start(): Promise<void>; stop(): Promise<void>; drill(questionId: string): Promise<void>; readonly state: SessionState; on(cb:(s: SessionState)=>void): () => void }` |
| M23 | DP-TURNTAKING | `src/mockrill/voice/turnController.ts` | `TurnControllerDeps` | `{ mic; client: StreamingClient; speaker; bus: MockrillEventBus; nextAction(input: TurnRequest): Promise<InterviewerAction> }` |
| M24 | DP-INTERVIEWER | `src/mockrill/engine/types.ts` | `TurnRequest`, `InterviewerAction` | `TurnRequest = { session_id: string; asked: string[]; last_turn: TranscriptTurn\|null; role: string }`; `InterviewerAction = { say: string; question: InterviewQuestion\|null; score: AnswerScore\|null; done: boolean; degraded: boolean }` |
| M25 | DP-INTERVIEWER | `src/mockrill/engine/tools.ts` | `SELECT_QUESTION_TOOL`, `SCORE_ANSWER_TOOL`, `TAG_FILLER_TOOL`, `MOCKRILL_TOOLS` | OpenAI-format tool descriptors |
| M26 | DP-INTERVIEWER | `src/mockrill/engine/llmGateway.ts` | `chatCompletion` | `(req: GatewayRequest) => Promise<GatewayResponse \| DegradedResult<GatewayResponse>>` (server-only) |
| M27 | DP-INTERVIEWER | `api/turn.ts` | default handler | `POST /api/turn` body `TurnRequest` → always `200 InterviewerAction` |
| M28 | DP-INTERVIEWER | `engine/agents/index.ts` | `callInterviewer` | `withResilience`-wrapped `(req: TurnRequest) => Promise<InterviewerAction\|DegradedResult<InterviewerAction>>` |
| M29 | DP-INTERVIEWER | `engine/rag/question-bank.json` | data | `{ version: string; roles: Record<string, InterviewQuestion[]> }` |
| M30 | DP-SCORECARD | `src/mockrill/scoring/fillers.ts` | `FILLER_LEXICON`, `detectFillers` | `(turn: TranscriptTurn) => FillerHit[]` |
| M31 | DP-SCORECARD | `src/mockrill/scoring/evidence.ts` | `buildEvidence` | `(turn: TranscriptTurn, hits: FillerHit[]) => EvidenceQuote[]` |
| M32 | DP-SCORECARD | `src/mockrill/scoring/rubric.ts` | `scoreAnswerDeterministic` | `(turn: TranscriptTurn, q: InterviewQuestion) => AnswerScore` |
| M33 | DP-SCORECARD | `src/mockrill/scoring/rubric.ts` | `mergeScores` | `(llm: AnswerScore\|null, det: AnswerScore) => AnswerScore` |
| M34 | DP-SCORECARD | `src/mockrill/scoring/scorecard.ts` | `buildScorecard` | `(input: { session_id: string; started_at: number; scores: AnswerScore[]; turns: TranscriptTurn[]; degraded: boolean }) => Scorecard` |
| M35 | DP-SCORECARD | `src/mockrill/scoring/scorecard.ts` | `selectWeakest` | `(s: Scorecard) => string\|null` |
| M36 | DP-SCORECARD | `src/mockrill/scoring/index.ts` | barrel | re-exports M30–M35 |
| M37 | DP-UI | `src/mockrill/ui/eventBus.ts` | `createEventBus`, `MockrillEventBus` | `{ emit(env: EventEnvelope): void; subscribe(cb:(env: EventEnvelope)=>void): () => void; snapshot(): EventEnvelope[]; reset(): void }` |
| M38 | DP-UI | `src/mockrill/ui/useMockrillEvents.ts` | `useMockrillEvents` | `(opts: { source: "live"\|"stream"; bus?: MockrillEventBus; url?: string }) => UseEventStreamResult` |
| M39 | DP-UI | `src/mockrill/ui/main.tsx` + root `index.html` | app entry | `index.html` script src becomes `/src/mockrill/ui/main.tsx` |
| M40 | DP-DEPLOY | `api/health.ts` | default handler | `GET /api/health` → `200 { ok: true, version, commit }`; `/health` rewrites to it |
| M41 | DP-DEPLOY | `vercel.json` (repo root) | config | vite framework, `npm run build`, `dist`, `/health` rewrite, SSE headers |
| M42 | DP-DEMOPROOF | `fixtures/mockrill/session-golden.json` | data | `{ turns: TranscriptTurn[]; actions: InterviewerAction[]; scorecard: Scorecard }` |
| M43 | DP-DEMOPROOF | `scripts/mockrill-mock-publish.ts` | CLI | SSE at `http://localhost:8787/events/stream` replaying M42 via `createPublisher` |
| M44 | DP-DEMOPROOF | `docs/fallback-ladder.md` | doc | the 4 rungs with exact commands |
| M45 | DP-SUBMIT | `docs/architecture.mmd` / `.png` | diagram | mirrors S4 |
| M46 | DP-SUBMIT | `submission.md` | doc | the 10 submission fields |

**`package.json` script ownership** (no two plans touch the same key; existing
chassis keys `dev`, `build:ui`, `deploy`, `deploy:verify`, `demodrive`, `faqdef`,
… are read-only):

| key | owner | command |
|---|---|---|
| `build` | DP-DEPLOY | `vite build` |
| `preview` | DP-DEPLOY | `vite preview --port 4173` |
| `mock:publish` | DP-DEMOPROOF | `vite-node scripts/mockrill-mock-publish.ts` |
| `golden:record` | DP-DEMOPROOF | `vite-node src/resilience/scripts/record-golden.ts` |
| `typecheck` | DP-CONTRACTS | `tsc --noEmit` |
| `test:mockrill` | DP-CONTRACTS | `vitest run tests/mockrill` |

### S8. HARD QUALITY BAR — the implementor is a LOW-INTELLIGENCE model

The design plan you write will be executed literally by a weak model driven by
`run_sweep.sh --planner` / `--sequence`. It cannot infer, choose, or look things
up. Therefore your plan MUST:

- **Fully define every contract**: exact file path, exact exported name, exact
  TypeScript signature, exact input/output JSON shape. For anything crossing a
  module boundary, state the owning module, file, export and every consumer, and
  state explicitly that consumers **import** it and never re-define or stub it.
- **Spell out every algorithm** as numbered steps or pseudocode. Zero
  "use judgment", zero "as appropriate", zero unstated defaults. Every constant
  (timeouts, thresholds, lexicon entries, chunk sizes, retry counts, model ids)
  is written out literally.
- **End every work unit with ONE runnable verification command and its exact
  expected output.** For a work unit that crosses a module boundary, the command
  must import the provider's real export from the provider's real path and
  assert on its real output — not a local stub.
- **Split any task that would need real intelligence** until it does not, or
  move that part into a prompt template that the runtime LLM call receives.
- Every work unit must be completable in one focused pass, touch a named list of
  files, and be independently verifiable.

### S9. Required design-plan format (chassis format)

Write the plan to `private/design_documents/design_plans/DP-<TOPIC>.md` with
exactly these sections, in this order:

```
# DP-<TOPIC> — <Title>

## §1 Purpose & scope
  §1.1 What this plan delivers (3–6 bullets)
  §1.2 Explicitly OUT of scope, and which DP owns it instead (table)
## §2 Requirements
  Table: requirement id | statement | source (FR-/NFR- id from the blueprint) | judging axis
## §3 Contracts OWNED by this plan
  One subsection per export: file path · exported name · full TS signature ·
  full input/output JSON shape · every consumer DP · the sentence
  "Consumers MUST import this from <path>; re-defining or stubbing it is a defect."
## §4 Contracts CONSUMED by this plan
  Table: import path | export | signature | owning module/DP. Plus the rule that
  none of them may be re-implemented.
## §5 Algorithms
  Numbered steps or pseudocode for every behavior, with every literal constant.
## §6 Configuration, environment & files
  Env vars (name, who reads it, default, what happens when missing), config files,
  complete file map of everything this plan creates or edits.
## §7 Failure & degradation behavior
  Table: failure | detection | DegradedResult reason string | what the user sees |
  which fallback-ladder rung it maps to.
## §8 Public surface & import rules
  What is exported from the plan's barrel; what is internal; the deep-import ban.
## §9 Work units
  WU-<TOPIC>-01 … NN. Each with: Goal · Depends on (WU/DP ids) · Files touched ·
  Numbered implementation steps · **Verification command** (one runnable line) ·
  **Expected output** (exact text) · Done-when.
## §10 Acceptance criteria
  Checklist mapping each §2 requirement to the WU that satisfies it.
## §11 Non-goals
## §12 Open questions
  Anything the blueprint did not settle, with the safe default you chose.
```

### S10. Rules for this authoring chat

1. Produce **exactly one file**: `private/design_documents/design_plans/DP-<TOPIC>.md`.
   Do not write code files. Do not implement anything. Do not create other plans.
2. Do not read any other file — everything you need is in this prompt. If you
   believe something is missing, add a `## BLUEPRINT GAP` section at the top of
   the plan naming what is missing and the minimum safe default you chose inside
   your own namespace, then continue.
3. Never design against `src/media`, `src/cost`, `src/dev`, `src/pgm`,
   `src/profile`, `src/assembly` — they are excluded from the manifest and absent.
4. Never modify chassis files.
5. When finished, print the path of the file you wrote and stop.

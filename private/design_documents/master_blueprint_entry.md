# Master Blueprint — Mockrill (2026-09 AssemblyAI Voice Agent Hackathon)

> **Status:** binding. This file plus the PROMPT-DP-*.md files in
> `private/design_documents/prompts/` are the ONLY shared context between the
> independent chats that author `private/design_documents/design_plans/DP-*.md`.
> If a detail is not here or in a prompt, it does not exist and MUST NOT be
> invented by a plan author or an implementor.
>
> **Working copy:** `hackathon-entries/2026-09-assemblyAI` (this repo). All new
> code lives in `engine/`, `src/mockrill/`, `api/`, `scripts/`, `fixtures/`,
> `docs/`. **No file under `src/resilience/`, `src/platform/`, `src/context/`,
> `src/ideation/`, `src/provenance/` or `contracts/` may be created, edited or
> deleted by any plan.** Those are chassis; compose them, never change them.
>
> **Manifest precedence:** `assembly.manifest.json` is authoritative.
> Included: `resilience`, `platform`, `ideation`, `context`, `provenance`.
> Excluded: `media`, `dev-tooling`, `assembly-advisory`, `data`, `cost`, `pgm`,
> `profile`. **No plan may import, invoke or assume `src/media`, `src/cost`,
> `src/dev`, `src/pgm`, `src/profile` or `src/assembly` — they are not present
> in this working copy.** Every walkthrough instruction that references them
> (`withStt`, `withTts`, `with_cost_guardrail`, `src/dev/eval`, `src/dev/mock`,
> `src/dev/track`, `mock:publish`) is superseded by this blueprint.

---

## §0. Compliance extract — DISQUALIFICATION-LEVEL (verbatim from the brief)

Source: `design_documents/hackathon_brief.md` §4 ("Hackathon Rules - Requirements - Tracks")
and §2, transcribed 2026-09-01 from
`https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon`.

### §0.1 MANDATORY TECHNOLOGIES (verbatim)

> "Every participant builds on AssemblyAI." (header block)

> "Build a voice agent using AssemblyAI's real-time voice AI technology. Choose
> the approach that fits your idea and how much of the voice stack you want to
> build yourself."

> "Path A — Voice Agent API (end-to-end, one connection) — Build an end-to-end
> voice agent through a single connection, with AssemblyAI handling the core
> voice interaction stack: • Speech-to-text powered by Universal-3 Pro • LLM
> routing and voice output • Turn-taking and voice activity detection •
> JSON-Schema tool calling • Designed for fast, natural voice interactions"

> "Path B — Realtime Speech-to-Text API (bring your own orchestration) — Use
> AssemblyAI's real-time speech-to-text API as the foundation of your voice
> agent, while bringing your own orchestration: • Real-time speech-to-text over
> WebSocket • Sub-second transcription • Multilingual speech recognition • Bring
> your own LLM and text-to-speech • More control over your voice-agent
> architecture"

**Binding reading:** exactly ONE mandatory technology — AssemblyAI. Path A and
Path B are alternatives *within one ranking*; the brief states no preference and
no separate track. Satisfying either path satisfies the mandate in full.

**No secondary mandated technology exists.** The single required credential is
`ASSEMBLYAI_API_KEY`.

### §0.2 PRIZE TRACKS (verbatim)

> "**Total pool** — **$10,000** — **$5,000 cash + $5,000 in AssemblyAI API
> credits**. **5 winners**, each receiving **$1,000 cash + $1,000 in API credits**"

> "Tracks: TBA / Announced soon" (live dashboard, re-checked 2026-09-01)

> "Sponsor sub-prizes — None listed — `sponsors: []`, `eventPrizes: []` in the
> event record as of Sep 1."

**Binding reading:** there is **one flat prize track with five equal winners**.
There is **no grand prize distinct from a side track** and **no side track to
win**. The instruction "win the grand prize AND at least one side-track prize"
therefore resolves, for this event, to: **place in the top 5 of the single
ranking.** `sponsor_tracks` in `winning_project_plan.md`
(`["AssemblyAI Voice Agent API", "AssemblyAI Realtime STT API"]`) names the two
*implementation paths*, not organizer tracks; this is the highest-win-probability
choice available because it is the only choice available.

**Standing instruction for every plan:** if the 15:15 UTC "Introduction to the
Challenge" session, the 16:00 UTC Discord Q&A, or any later announcement
publishes real tracks or sponsor sub-challenges, this §0.2 is void and
`design_documents/hackathon_brief.md` §4 must be re-transcribed and this
blueprint amended before further work. Until then no plan may design for a track.

### §0.3 JUDGING AXES (verbatim, weights unpublished)

| Axis | Top-band rubric (verbatim excerpt) |
|---|---|
| **Application of Technology** | *"exceptional application of AI technology through demo link, video & GitHub code … flawless technical implementation."* |
| **Presentation** | *problem/solution/value communicated in <5 min, competitive analysis, flawless delivery.* |
| **Business Value** | *"potential to disrupt the industry … clear sustainable revenue generation and long-term business success."* |
| **Originality** | *"exceptionally original, transformative idea … completely new perspective."* |

Weights `[unconfirmed]`. **Plan assumption: equal quarters.** No plan may
optimize one axis at another's expense.

### §0.4 SUBMISSION GATE (verbatim 10 fields + binding formats)

1. Project title
2. Short description
3. Long description
4. Technology & category tags
5. Cover image — **PNG or JPG, 16:9 aspect ratio**
6. Video presentation — **MP4**; rubric band **3–5 minutes** (*"less than 5 min"*,
   penalizes under 3 min)
7. Slide presentation — **PDF** (mandatory)
8. Public GitHub repository (mandatory — *"for storing your code"*)
9. Demo application platform (where it is hosted)
10. Application URL — *"required for interactive evaluation"*

Plus: > "Submissions must be **original and MIT-compliant**"

**Hard deadline:** Wed 2026-09-30 15:00 UTC. **Internal target:** Wed 2026-09-24
15:00 UTC. Manual submission exists only ≤6 h post-deadline with prior approval —
never plan around it.

### §0.5 BONUS

**No bonus — the brief lists no bonus integrations, no bonus points, and no
partner add-ons. Not worth track dilution.** No plan may add a non-AssemblyAI
vendor for "bonus" reasons.

---

## §1. Requirements

Each row traces: brief mandate → `winning_project_plan.md` section → judging axis
→ owning design plan.

### §1.1 Functional requirements

| ID | Requirement | Traced to plan §                       | Judging axis | Owning DP |
|---|---|---|---|---|
| FR-01 | Browser captures the candidate's microphone as PCM s16le, 16 kHz, mono, in 160–200 ms chunks, over an HTTPS origin. | Architecture ("capture mic … streaming 16-bit mono PCM") | Application of Technology | DP-AAI-STREAM |
| FR-02 | Audio streams to `wss://streaming.assemblyai.com/v3/ws` with `speech_model=universal-3-5-pro`, authenticated by a short-lived token minted server-side; the raw API key never reaches the browser. | AI Solution (Path B, "wss://streaming.assemblyai.com/v3/ws … universal-3-5-pro") | Application of Technology | DP-AAI-STREAM |
| FR-03 | `Begin` / `Turn` / `Termination` events are handled; partial turns render live and `end_of_turn && turn_is_formatted` turns are finalized with `words[].start/end/confidence`. | Architecture ("audio chunks → Turn events") | Application of Technology | DP-AAI-STREAM |
| FR-04 | The interviewer speaks each question and follow-up aloud, mutes the microphone stream while speaking, and cancels speech on barge-in. | AI Solution ("client handles barge-in and turn_is_formatted finalization") | Application of Technology, Originality | DP-TURNTAKING |
| FR-05 | Question selection, answer scoring and filler tagging run as **JSON-Schema tool calls** (`select_question`, `score_answer`, `tag_filler`) against the AssemblyAI LLM Gateway. | AI Solution ("LLM routing via JSON-Schema tools"); Suggested Module Emphasis | Application of Technology | DP-INTERVIEWER |
| FR-06 | Multi-turn interview history is held in a budget-fitted conversation buffer so a long session never overflows the model context. | Architecture ("Conversation buffer holds multi-turn STAR answers") | Application of Technology | DP-INTERVIEWER |
| FR-07 | The scorecard quotes exact spoken moments with `mm:ss` timestamps derived from `words[].start` (e.g. *"at 07:42 you said 'kind of' 3×"*). | Executive Pitch ("evidence-backed scorecard quoting exact spoken moments") | Originality, Business Value | DP-SCORECARD |
| FR-08 | Filler-word detection is **deterministic** (lexicon over word timestamps), not an LLM call. | Constraints ("prefer deterministic code over extra LLM calls") | Application of Technology | DP-SCORECARD |
| FR-09 | The weakest answer is identified and re-drilled **by voice in the same session** without reconnecting. | Executive Pitch ("re-drills weakest answers by voice in the same session") | Originality | DP-SCORECARD + DP-UI |
| FR-10 | UI presents five states: pre-call setup, live ticking transcript, scorecard, re-drill, history. | Architecture ("UI states: pre-call setup, live transcript ticking, scorecard … history") | Presentation | DP-UI |
| FR-11 | Every UI-visible event is an `EventEnvelope` from `src/platform/transport`; the UI renders identically whether envelopes come from the live in-browser bus or a replayed SSE stream. | Suggested Module Emphasis ("Platform transport (TRN) + mock envelopes for live transcript ticking UI") | Presentation | DP-UI + DP-DEMOPROOF |
| FR-12 | The app is deployed to a public HTTPS URL with a `GET /health` endpoint returning 200. | Suggested Module Emphasis ("deploy via Vercel … HTTPS for mic") | Presentation (submission gate) | DP-DEPLOY |
| FR-13 | A four-rung degraded-demo ladder works offline: live → `RES_FORCED_DEGRADED=1` golden replay → recorded capture → localhost mock-envelope render. | Feasibility walkthrough §"Degraded-demo fallback ladder" | Presentation | DP-DEMOPROOF |
| FR-14 | Deck (PDF), 3–5 min timed script, judge Q&A sheet and DEMODRIVE capture are generated from `winning_project_plan.md` + `assembly.manifest.json` + `disclosure.md`. | Suggested Module Emphasis ("Ideation deck/script/FAQ/demodrive for pitch") | Presentation, Business Value | DP-PITCH |
| FR-15 | `disclosure.md`, `architecture-summary.md`, hygiene report, MIT `LICENSE`, spin-up `README.md`, architecture diagram and the 10-field `submission.md` are produced and consistent. | Suggested Module Emphasis ("Provenance disclosure via PROVO") | Presentation (submission gate) | DP-SUBMIT |

### §1.2 Non-functional requirements

| ID | Requirement | Rationale | Owning DP |
|---|---|---|---|
| NFR-01 | **Every** outbound network call (token mint, WS connect, LLM Gateway request) is wrapped by `withResilience` from `src/resilience` with `timeout_ms: 15000, retries: 1, fallback_chain: { order: ["cache", "none"] }`. No bare `fetch`/`new WebSocket` outside the files named in §2.4. | Constraint; single biggest event-day failure mode | all |
| NFR-02 | No call site ever throws to the UI. Failures surface as `DegradedResult` and are rendered with `isDegradedEnvelope` / `degradedResultOf`. | GOV-RES / demo survival | all |
| NFR-03 | `RES_FORCED_DEGRADED=1` in the serving environment makes every wrapped call serve its golden cache entry instantly, with no network. | Fallback ladder rung 2 | DP-DEMOPROOF |
| NFR-04 | Exactly one runtime secret: `ASSEMBLYAI_API_KEY`. It is read **only** in `api/*.ts` (server side). `OPENAI_API_KEY`, `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` are build/tooling-only. No other vendor key is introduced. | Budget honesty; §0.5 no-bonus rule | DP-DEPLOY |
| NFR-05 | The interview path costs at most **one** LLM Gateway request per candidate turn. Scoring reuses that same response; deterministic scoring runs with zero requests. | "prefer deterministic code over extra LLM calls" | DP-INTERVIEWER, DP-SCORECARD |
| NFR-06 | End-to-end perceived latency from `end_of_turn` to the interviewer beginning to speak ≤ 2.0 s p50 on a normal connection. | "sub-second voice turn-taking … is the core capability" | DP-TURNTAKING |
| NFR-07 | No secret, transcript, or personal audio is committed to the repo. `private/` is git-ignored. Hygiene scan passes before submission. | MIT-compliant + original; secret scan | DP-SUBMIT |
| NFR-08 | The app builds and renders with **zero network access** (`npm run build && npm run preview` + mock publisher). | Bad-Wi-Fi demo constraint | DP-DEMOPROOF |
| NFR-09 | Node ≥ 20, TypeScript strict, ESM, `moduleResolution: NodeNext`. Imports of chassis code use the `src/<module>` barrel path only — never a deep path. | tsconfig.json; chassis barrels are CI-blocked against deep imports | all |
| NFR-10 | Every work unit in every plan ends with one runnable command and its exact expected stdout. | Hard quality bar | all |

---

## §2. Architecture

### §2.1 Path decision (binding, with rationale)

**Shipped hosted path = Path B (Realtime Speech-to-Text API + own orchestration),
with the orchestration LLM also served by AssemblyAI's LLM Gateway.**

Rationale, recorded because it is a deliberate deviation from
`winning_project_plan.md`'s "Path A preferred" wording:

1. The brief treats the two paths as equal alternatives (§0.1) — Path B is a
   first-class way to satisfy "Every participant builds on AssemblyAI".
2. Submission field 10 requires a **hosted Application URL for interactive
   evaluation**, and `getUserMedia` requires HTTPS. The deploy provider in
   `assembly.manifest.json` is Vercel, whose serverless functions cannot hold the
   long-lived server-side socket that the Path A starter
   (`voice-agent-starter-python` / `-js`, `python deployment/browser/server.py`,
   `localhost:3000`) is built around. Path B connects **browser → AssemblyAI**
   directly with a temporary token, which deploys as static assets + three
   stateless functions.
3. Using the **AssemblyAI LLM Gateway** for the orchestration LLM means the STT,
   the LLM routing and the JSON-Schema tool calling all run on AssemblyAI
   infrastructure with a single key — i.e. Path B here is *more* AssemblyAI
   surface area than a naive Path A wiring, which directly serves the
   "Application of Technology" axis.
4. Path A remains reachable as an **optional, cuttable enhancement** and is NOT
   in scope of any design plan. If it is ever built it gets its own plan; nothing
   in the shipped app may depend on it.

### §2.2 Component and data flow

```
┌────────────────────────── BROWSER (HTTPS origin, Vercel static) ───────────────────────────┐
│                                                                                            │
│  MicSource (AudioWorklet)          StreamingClient                TurnController           │
│  getUserMedia → Float32            WS to AssemblyAI               state machine            │
│  → Int16 16 kHz mono               v3/ws?token=…                  idle→listening→           │
│  → 200 ms chunks ────────────────► sendAudio(Int16Array)          thinking→speaking         │
│         ▲                                   │                          │                    │
│         │ mute while speaking               │ Begin/Turn/Termination   │                    │
│         └───────────────────────────────────┼──────────────────────────┘                    │
│                                             ▼                                               │
│                                   TranscriptTurn                                            │
│                                             │                                               │
│                    ┌────────────────────────┼──────────────────────────┐                    │
│                    ▼                        ▼                          ▼                    │
│              Speaker (TTS)          MockrillEventBus            scoring/ (deterministic)     │
│              speechSynthesis   emits EventEnvelope[]            fillers · evidence           │
│                    ▲                        │                          │                    │
│                    │                        ▼                          ▼                    │
│                    │                 useMockrillEvents()  ────►  Scorecard                   │
│                    │                        │                                               │
│                    │                        ▼                                               │
│                    │        React screens: Setup · LiveCall · ScorecardView · Drill          │
│                    │        (chassis UI: StreamingTextRenderer, StepStatusIndicator,         │
│                    │         CitationDisplay, setTheme, isDegradedEnvelope)                  │
│                    │                                                                        │
│                    └──────────── interviewer utterance ◄─────────┐                          │
└──────────────────────────────────────────────────────────────────┼──────────────────────────┘
                                     │ POST /api/turn              │
                                     ▼                             │
┌────────────────── VERCEL SERVERLESS FUNCTIONS (hold ASSEMBLYAI_API_KEY) ─────────┼──────────┐
│  GET  /api/aai-token   → mint streaming token   (withResilience)                 │          │
│  POST /api/turn        → LLM Gateway chat/completions with tools                 │          │
│                          (withResilience + src/context fit/append) ──────────────┘          │
│  GET  /health          → { ok: true, version } (smoke target for deploy:verify)             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                    https://llm-gateway.assemblyai.com/v1/chat/completions
                    https://streaming.assemblyai.com/v3/token
```

Offline / degraded flow (rung 4): `scripts/mockrill-mock-publish.ts` serves the
canned envelope sequence over SSE at `/events/stream`; the UI's
`useMockrillEvents({ source: "stream" })` delegates to the chassis
`useEventStream()` and renders the identical screens with no microphone, no key
and no network beyond localhost.

### §2.3 Verified external API facts (do not re-derive; do not invent)

Verified 2026-09-01 against AssemblyAI docs. Any value not listed here must be
looked up in the docs by the plan author and recorded in the plan, never guessed.

**Temporary token** — `GET https://streaming.assemblyai.com/v3/token`
· header `Authorization: <ASSEMBLYAI_API_KEY>` (no `Bearer`)
· query `expires_in_seconds` (required, 1–600), `max_session_duration_seconds`
  (optional, 60–10800, default 10800)
· response `{ "token": string, "expires_in_seconds": number }`
· errors 400 / 401 / 429 / 500 with `{ error, code?, details? }`.

**Streaming socket** — `wss://streaming.assemblyai.com/v3/ws`
· auth: `token=<temp token>` query parameter (browser) OR `Authorization` header (server)
· `speech_model` default `universal-3-5-pro`
· `sample_rate` 8000–96000, default `16000`
· `encoding` one of `pcm_s16le | pcm_mulaw | opus | ogg_opus | aac`, default `pcm_s16le`
· `format_turns` boolean, default `false`
· `end_of_turn_confidence_threshold` 0.0–1.0, default `0.4`
· `min_turn_silence` 50–10000 ms · `max_turn_silence` default `1536` ms
· `vad_threshold` 0.0–1.0 default `0.2` · `interruption_delay` 0–1000 ms
· `keyterms_prompt` array[string] · `prompt` / `agent_context` strings ≤1750 chars
· `mode` one of `max_accuracy | min_latency | balanced`
· audio frames: **binary**, PCM s16le 16 kHz mono, 50–1000 ms per message
  (recommended 160–200 ms)
· server → client `{"type":"Begin","id","expires_at","configuration":{…}}`
· server → client `{"type":"Turn","turn_order","turn_is_formatted","end_of_turn",
  "transcript","utterance","end_of_turn_confidence","words":[{"text","start","end",
  "confidence","word_is_final"}]}` — `start`/`end` are **milliseconds from session start**
· server → client `{"type":"Termination","audio_duration_seconds","session_duration_seconds"}`
· client → server `{"type":"Terminate"}` · `{"type":"ForceEndpoint"}` ·
  `{"type":"UpdateConfiguration", …}` (updatable: `prompt`, `keyterms_prompt`,
  `min_turn_silence`, `max_turn_silence`, `end_of_turn_confidence_threshold`,
  `continuous_partials`, `vad_threshold`, `interruption_delay`, `mode`,
  `agent_context`, …)
· billing is on total socket-open duration; the socket auto-closes after 3 h.

**LLM Gateway** — `POST https://llm-gateway.assemblyai.com/v1/chat/completions`
· header `Authorization: <ASSEMBLYAI_API_KEY>`, `Content-Type: application/json`
· **OpenAI-compatible**: `{ model, messages, tools, tool_choice, max_tokens }`
· `tools[]` = `{ "type": "function", "function": { name, description, parameters } }`
  where `parameters` is a JSON Schema object
· response `{ "choices": [ { "message": { "role":"assistant", "content"?,
  "tool_calls": [ { "id", "type":"function", "function": { "name",
  "arguments": "<JSON string>" } } ] }, "finish_reason" } ], "request_id" }`
· model id used in the official tool-calling example: `claude-sonnet-4-6`;
  a fast small model documented in the quickstart: `qwen3.5-4b-32k-fast`.
  **Binding choice for this entry: `claude-sonnet-4-6` primary,
  `qwen3.5-4b-32k-fast` as the configured `MOCKRILL_LLM_FALLBACK_MODEL`.**

**Not used, deliberately:** ElevenLabs / OpenAI TTS. Voice output uses the
browser's built-in `window.speechSynthesis` — zero keys, zero cost, works with no
network, and keeps NFR-04 to a single secret. This is a recorded decision, not an
omission, and DP-SUBMIT must disclose it.

### §2.4 Inter-module contract table (SINGLE OWNER, N CONSUMERS)

**Rule (§3a):** every row below is owned by exactly one plan. Consumers **import
it**. A consumer that defines, stubs, re-types or re-implements any row has
failed its plan. Chassis rows are owned by the chassis and are read-only.

#### §2.4.1 Chassis-owned rows (import only; never modify, never re-declare)

| # | Import path | Export | Shape / signature | Consumers |
|---|---|---|---|---|
| C1 | `src/resilience` | `withResilience` | `<T>(fn: () => Promise<T>, config?: ResilienceConfig, deps?) => () => Promise<T \| DegradedResult<T>>` | DP-AAI-STREAM, DP-INTERVIEWER, DP-DEPLOY |
| C2 | `src/resilience` | `isDegradedResult` | `(v: unknown) => v is DegradedResult` | DP-SCORECARD, DP-UI, DP-INTERVIEWER |
| C3 | `src/resilience` | `makeDegradedResult` | `<T>({reason, fallback_source, original_error?, data?}) => DegradedResult<T>` | DP-AAI-STREAM, DP-INTERVIEWER, DP-SCORECARD |
| C4 | `src/resilience` | type `DegradedResult<T>` | `{degraded:true; reason:string; fallback_source:"secondary_provider"\|"cache"\|"replay"\|"none"; original_error:string\|null; data:T\|null; timestamp:string; version:"1.0.0"}` | DP-CONTRACTS (re-export forbidden — import directly), all |
| C5 | `src/resilience` | type `ResilienceConfig` | `{timeout_ms?, retries?, backoff?, fallback_chain?, cache_key_strategy?, cache_key_explicit?, forced_degraded?}` | DP-AAI-STREAM, DP-INTERVIEWER |
| C6 | `src/resilience` | `createGoldenCache` | `(rootDir?: string) => GoldenCache` with `get/put/has/delete/list/clear/deriveKey` | DP-DEMOPROOF |
| C7 | `src/platform/transport` | type `EventEnvelope` | `{step_id:string; status:"started"\|"streaming"\|"done"\|"error"; payload:Record<string,unknown>; timestamp:string; sequence:number; trace_id?:string; degraded?:boolean}` | DP-CONTRACTS (the ONLY module allowed to build on it), DP-UI, DP-DEMOPROOF |
| C8 | `src/platform/transport` | `createPublisher` | `(transport?: "sse"\|"websocket") => CollectablePublisher` (`publish`, `publishDelta`, `close`, `collect`, `asSseStream`) | DP-DEMOPROOF only |
| C9 | `src/platform/transport` | `useEventStream` | `(opts?: SubscribeOptions) => { envelopes: EventEnvelope[]; status: StreamStatus; error: Error\|null; degraded: boolean; reconnect(): void }` | DP-UI only |
| C10 | `src/platform/ui` | `StreamingTextRenderer`, `StepStatusIndicator`, `CitationDisplay`, `setTheme`, `resolveTheme`, `isDegradedEnvelope`, `degradedResultOf` | React components + theme helpers | DP-UI only |
| C11 | `src/context` | `fit`, `append` | `fit(buffer: Message[], config?: Partial<ContextBudgetConfig>) => {buffer, status}`; `append(buffer, message, config?) => {buffer, status}` | DP-INTERVIEWER only |
| C12 | `src/context` | types `Message`, `Buffer`, `BufferStatus`, `FitResult`, `ContextBudgetConfig` | `Message = {role:"system"\|"user"\|"assistant"\|"tool"; content:string; metadata?:{timestamp?,pinned?,priority?,id?}; token_count?:number\|null}` | DP-INTERVIEWER only |
| C13 | `src/provenance/provo/cli.ts` | CLI `generate` / `summary` | writes `disclosure.md`, `architecture-summary.md` | DP-SUBMIT only |
| C14 | `src/provenance/submit/cli.ts` | CLI `format` / `hygiene` | writes `submission.md`, `hygiene-report.{json,md}` | DP-SUBMIT only |
| C15 | `src/ideation/deckgen\|script\|faqdef\|demodrive/cli.ts` | CLIs | see §4 for exact invocations | DP-PITCH only |
| C16 | `src/platform/deploy/deploy.ts` via `npm run deploy` / `deploy:verify` | `runDeploy`, smoke poll of `GET $PUBLIC_URL/health` | — | DP-DEPLOY only |

#### §2.4.2 Entry-owned rows (each created by exactly one plan)

| # | Owning DP | File | Export | Shape / signature | Consumers |
|---|---|---|---|---|---|
| M1 | DP-CONTRACTS | `src/mockrill/contracts/types.ts` | `TranscriptWord` | `{ text: string; start: number; end: number; confidence: number; word_is_final: boolean }` (ms) | AAI-STREAM, SCORECARD, DEMOPROOF |
| M2 | DP-CONTRACTS | `src/mockrill/contracts/types.ts` | `TranscriptTurn` | `{ turn_order: number; transcript: string; formatted: boolean; end_of_turn: boolean; end_of_turn_confidence: number; words: TranscriptWord[]; speaker: "candidate" \| "interviewer"; received_at: string }` | AAI-STREAM, TURNTAKING, INTERVIEWER, SCORECARD, UI, DEMOPROOF |
| M3 | DP-CONTRACTS | `src/mockrill/contracts/types.ts` | `InterviewQuestion` | `{ id: string; text: string; competency: "behavioral" \| "technical" \| "situational"; difficulty: 1\|2\|3; follow_ups: string[]; keyterms: string[] }` | INTERVIEWER, SCORECARD, UI |
| M4 | DP-CONTRACTS | `src/mockrill/contracts/types.ts` | `RubricAxis` | `"structure" \| "specificity" \| "clarity" \| "relevance"` | INTERVIEWER, SCORECARD, UI |
| M5 | DP-CONTRACTS | `src/mockrill/contracts/types.ts` | `EvidenceQuote` | `{ kind: "filler" \| "quote" \| "pause"; text: string; start_ms: number; end_ms: number; label: string /* "07:42" */; note: string }` | SCORECARD, UI |
| M6 | DP-CONTRACTS | `src/mockrill/contracts/types.ts` | `FillerHit` | `{ word: string; start_ms: number; end_ms: number }` | SCORECARD, UI |
| M7 | DP-CONTRACTS | `src/mockrill/contracts/types.ts` | `AnswerScore` | `{ question_id: string; turn_order: number; axes: Record<RubricAxis, number /*0-5*/>; overall: number /*0-5*/; rationale: string; evidence: EvidenceQuote[]; source: "llm" \| "deterministic" }` | INTERVIEWER, SCORECARD, UI |
| M8 | DP-CONTRACTS | `src/mockrill/contracts/types.ts` | `Scorecard` | `{ session_id: string; created_at: string; duration_ms: number; per_question: AnswerScore[]; overall: number; filler_total: number; filler_top: FillerHit[]; weakest_question_id: string \| null; degraded: boolean }` | SCORECARD, UI, DEMOPROOF |
| M9 | DP-CONTRACTS | `src/mockrill/contracts/types.ts` | `SessionState` | `"idle"\|"connecting"\|"listening"\|"thinking"\|"speaking"\|"scoring"\|"complete"\|"failed"` | TURNTAKING, UI |
| M10 | DP-CONTRACTS | `src/mockrill/contracts/steps.ts` | `MOCKRILL_STEP_IDS`, type `MockrillStepId` | frozen array + union of: `"session-start"`, `"mic-capture"`, `"transcript-partial"`, `"transcript-final"`, `"question-asked"`, `"answer-scored"`, `"scorecard-ready"`, `"drill-start"`, `"session-end"` | every plan that emits or reads envelopes |
| M11 | DP-CONTRACTS | `src/mockrill/contracts/steps.ts` | `StepPayloads` | mapped type `{ "transcript-final": { turn: TranscriptTurn }, "answer-scored": { score: AnswerScore }, … }` — exact map in the plan | UI, DEMOPROOF, AAI-STREAM, INTERVIEWER, SCORECARD |
| M12 | DP-CONTRACTS | `src/mockrill/contracts/envelope.ts` | `makeEnvelope` | `<K extends MockrillStepId>(stepId: K, status: EventEnvelope["status"], payload: StepPayloads[K], opts?: { traceId?: string; sequence?: number; degraded?: boolean }) => EventEnvelope` | AAI-STREAM, TURNTAKING, INTERVIEWER, SCORECARD, UI, DEMOPROOF |
| M13 | DP-CONTRACTS | `src/mockrill/contracts/time.ts` | `formatTimestamp` | `(ms: number) => string` → zero-padded `mm:ss` (`462000 → "07:42"`) | SCORECARD, UI, PITCH |
| M14 | DP-CONTRACTS | `src/mockrill/contracts/index.ts` | barrel | re-exports M1–M13 only | all entry code |
| M15 | DP-CONTRACTS | `engine/schema/input.schema.json` / `output.schema.json` | JSON Schema | Engine I/O (validated via RES-04) | INTERVIEWER |
| M16 | DP-AAI-STREAM | `api/aai-token.ts` | default handler | `GET /api/aai-token` → `200 { token, expires_in_seconds }` \| `503 DegradedResult` | UI (fetch), DEPLOY (route registry) |
| M17 | DP-AAI-STREAM | `src/mockrill/voice/mic.ts` | `createMicSource` | `(opts: { sampleRate?: 16000 }) => Promise<{ stream: MediaStream; onChunk(cb: (pcm: Int16Array) => void): void; setMuted(m: boolean): void; stop(): void }>` | TURNTAKING, UI |
| M18 | DP-AAI-STREAM | `src/mockrill/voice/streamingClient.ts` | `createStreamingClient` | `(opts: StreamingClientOptions) => StreamingClient` — `connect(): Promise<void \| DegradedResult<never>>`, `sendAudio(pcm: Int16Array): void`, `updateConfiguration(patch: Record<string, unknown>): void`, `forceEndpoint(): void`, `terminate(): Promise<void>`, `readonly state: "closed"\|"connecting"\|"open"` | TURNTAKING, UI, DEMOPROOF |
| M19 | DP-AAI-STREAM | `src/mockrill/voice/streamingClient.ts` | `StreamingClientOptions` | `{ tokenUrl?: string; speechModel?: string; keyterms?: string[]; onPartial(t: TranscriptTurn): void; onFinal(t: TranscriptTurn): void; onBegin(id: string): void; onTermination(s: { audio_duration_seconds: number; session_duration_seconds: number }): void; onDegraded(d: DegradedResult<unknown>): void }` | TURNTAKING, UI |
| M20 | DP-AAI-STREAM | `src/mockrill/voice/index.ts` | barrel | re-exports M17–M19 **and** M21–M22 | UI |
| M21 | DP-TURNTAKING | `src/mockrill/voice/speak.ts` | `createSpeaker` | `() => { speak(text: string): Promise<void>; cancel(): void; readonly speaking: boolean; readonly available: boolean }` | TURNTAKING, UI |
| M22 | DP-TURNTAKING | `src/mockrill/voice/turnController.ts` | `createTurnController` | `(deps: TurnControllerDeps) => { start(): Promise<void>; stop(): Promise<void>; drill(questionId: string): Promise<void>; readonly state: SessionState; on(cb: (s: SessionState) => void): () => void }` | UI |
| M23 | DP-TURNTAKING | `src/mockrill/voice/turnController.ts` | `TurnControllerDeps` | `{ mic: Awaited<ReturnType<typeof createMicSource>>; client: StreamingClient; speaker: ReturnType<typeof createSpeaker>; bus: MockrillEventBus; nextAction: (input: TurnRequest) => Promise<InterviewerAction> }` | UI |
| M24 | DP-INTERVIEWER | `src/mockrill/engine/types.ts` | `TurnRequest`, `InterviewerAction` | `TurnRequest = { session_id: string; asked: string[]; last_turn: TranscriptTurn \| null; role: string }`; `InterviewerAction = { say: string; question: InterviewQuestion \| null; score: AnswerScore \| null; done: boolean; degraded: boolean }` | TURNTAKING, UI, SCORECARD |
| M25 | DP-INTERVIEWER | `src/mockrill/engine/tools.ts` | `SELECT_QUESTION_TOOL`, `SCORE_ANSWER_TOOL`, `TAG_FILLER_TOOL`, `MOCKRILL_TOOLS` | OpenAI-format tool descriptors (see plan for exact JSON Schemas) | INTERVIEWER, SUBMIT (diagram) |
| M26 | DP-INTERVIEWER | `src/mockrill/engine/llmGateway.ts` | `chatCompletion` | `(req: GatewayRequest) => Promise<GatewayResponse \| DegradedResult<GatewayResponse>>` — server-side only | INTERVIEWER (`api/turn.ts`) |
| M27 | DP-INTERVIEWER | `api/turn.ts` | default handler | `POST /api/turn` body `TurnRequest` → `200 InterviewerAction` (never 5xx: degraded actions return 200 with `degraded:true`) | TURNTAKING (via `nextAction`), UI |
| M28 | DP-INTERVIEWER | `engine/agents/index.ts` | `callInterviewer` | `withResilience`-wrapped; `(req: TurnRequest) => Promise<InterviewerAction \| DegradedResult<InterviewerAction>>` — replaces the `TODO(ENGINE)` stub | `api/turn.ts` |
| M29 | DP-INTERVIEWER | `engine/rag/question-bank.json` | data | `{ version: string; roles: Record<string, InterviewQuestion[]> }` | INTERVIEWER, DEMOPROOF |
| M30 | DP-SCORECARD | `src/mockrill/scoring/fillers.ts` | `FILLER_LEXICON`, `detectFillers` | `(turn: TranscriptTurn) => FillerHit[]` | SCORECARD, UI |
| M31 | DP-SCORECARD | `src/mockrill/scoring/evidence.ts` | `buildEvidence` | `(turn: TranscriptTurn, hits: FillerHit[]) => EvidenceQuote[]` | SCORECARD, UI |
| M32 | DP-SCORECARD | `src/mockrill/scoring/rubric.ts` | `scoreAnswerDeterministic` | `(turn: TranscriptTurn, q: InterviewQuestion) => AnswerScore` (source `"deterministic"`) | SCORECARD, INTERVIEWER (degraded path) |
| M33 | DP-SCORECARD | `src/mockrill/scoring/rubric.ts` | `mergeScores` | `(llm: AnswerScore \| null, det: AnswerScore) => AnswerScore` | INTERVIEWER |
| M34 | DP-SCORECARD | `src/mockrill/scoring/scorecard.ts` | `buildScorecard` | `(input: { session_id: string; started_at: number; scores: AnswerScore[]; turns: TranscriptTurn[]; degraded: boolean }) => Scorecard` | UI, DEMOPROOF |
| M35 | DP-SCORECARD | `src/mockrill/scoring/scorecard.ts` | `selectWeakest` | `(s: Scorecard) => string \| null` | UI |
| M36 | DP-SCORECARD | `src/mockrill/scoring/index.ts` | barrel | re-exports M30–M35 | UI, INTERVIEWER |
| M37 | DP-UI | `src/mockrill/ui/eventBus.ts` | `createEventBus`, type `MockrillEventBus` | `{ emit(env: EventEnvelope): void; subscribe(cb: (env: EventEnvelope) => void): () => void; snapshot(): EventEnvelope[]; reset(): void }` | TURNTAKING, AAI-STREAM, UI, DEMOPROOF |
| M38 | DP-UI | `src/mockrill/ui/useMockrillEvents.ts` | `useMockrillEvents` | `(opts: { source: "live" \| "stream"; bus?: MockrillEventBus; url?: string }) => UseEventStreamResult` — `"stream"` delegates to chassis `useEventStream` | UI screens |
| M39 | DP-UI | `src/mockrill/ui/main.tsx` + root `index.html` | app entry | boots `<App/>`; `index.html` script src becomes `/src/mockrill/ui/main.tsx` | DEPLOY, DEMOPROOF, PITCH |
| M40 | DP-DEPLOY | `api/health.ts` | default handler | `GET /api/health` → `200 { ok: true, version: string, commit: string }`; `vercel.json` rewrites `/health` → `/api/health` | DP-DEPLOY smoke, DP-SUBMIT |
| M41 | DP-DEPLOY | `vercel.json` (repo root) | config | `framework: vite`, `buildCommand: npm run build`, `outputDirectory: dist`, rewrite `/health`→`/api/health`, SSE headers on `/events` | all |
| M42 | DP-DEMOPROOF | `fixtures/mockrill/session-golden.json` | data | `{ turns: TranscriptTurn[]; actions: InterviewerAction[]; scorecard: Scorecard }` | DEMOPROOF, PITCH, SCORECARD tests |
| M43 | DP-DEMOPROOF | `scripts/mockrill-mock-publish.ts` | CLI | serves SSE at `http://localhost:8787/events/stream` replaying M42 as envelopes via `createPublisher` | UI (rung 4), PITCH (demodrive) |
| M44 | DP-DEMOPROOF | `docs/fallback-ladder.md` | doc | the 4 rungs with exact commands | PITCH, SUBMIT |
| M45 | DP-SUBMIT | `docs/architecture.mmd` + rendered `docs/architecture.png` | diagram | mirrors §2.2 | PITCH (deck), submission |
| M46 | DP-SUBMIT | `submission.md` | doc | the 10 fields of §0.4, filled | operator |

#### §2.4.3 `package.json` script ownership (no two plans touch the same key)

| Script key | Owning DP | Command |
|---|---|---|
| `build` | DP-DEPLOY | `vite build` (aliases the existing `build:ui`; required by `config/deploy/vercel.json`) |
| `preview` | DP-DEPLOY | `vite preview --port 4173` |
| `mock:publish` | DP-DEMOPROOF | `vite-node scripts/mockrill-mock-publish.ts` (the chassis reference to `scripts/mock-publish.ts` is dead — dev-tooling is excluded) |
| `golden:record` | DP-DEMOPROOF | `vite-node src/resilience/scripts/record-golden.ts` |
| `typecheck` | DP-CONTRACTS | `tsc --noEmit` |
| `test:mockrill` | DP-CONTRACTS | `vitest run tests/mockrill` |

Existing keys (`dev`, `build:ui`, `deploy`, `deploy:verify`, `demodrive`,
`faqdef`, …) are chassis-owned and must not be edited.

---

## §3. Design-plan map

Ten plans. Every plan is authored in its own fresh chat by executing
`private/design_documents/prompts/PROMPT-DP-<TOPIC>.md`, and lands at
`private/design_documents/design_plans/DP-<TOPIC>.md`.

| # | DP id | Title | Scope — IN | Scope — OUT (owned elsewhere) | Interfaces it OWNS | Consumers | Depends on | Requirements its work units must fulfil |
|---|---|---|---|---|---|---|---|---|
| 1 | **DP-CONTRACTS** | Mockrill Shared Contracts & Event Vocabulary | Every shared type, the step-id vocabulary, the payload map, `makeEnvelope`, `formatTimestamp`, engine JSON Schemas, `tsc`/vitest wiring | Any behavior. No network, no React, no scoring logic. | M1–M15, scripts `typecheck`, `test:mockrill` | all nine other plans | C7 (chassis `EventEnvelope`), C4 | FR-11, NFR-09, NFR-10 |
| 2 | **DP-AAI-STREAM** | AssemblyAI Universal-Streaming Client & Token Endpoint | `GET /api/aai-token`; mic capture → PCM s16le 16 kHz 200 ms; WS connect/send/receive; Begin/Turn/Termination handling; resilience wrapping; golden-cache replay hook | TTS, turn state machine (DP-TURNTAKING); LLM (DP-INTERVIEWER); React (DP-UI) | M16–M20 | TURNTAKING, UI, DEMOPROOF | DP-CONTRACTS; C1, C3, C5 | FR-01, FR-02, FR-03, NFR-01, NFR-02, NFR-04 |
| 3 | **DP-TURNTAKING** | Turn-Taking, Barge-In & Voice Output | `speechSynthesis` speaker; the `SessionState` machine; mute-while-speaking; barge-in cancel; `agent_context` push via `UpdateConfiguration`; drill re-entry | WS mechanics (DP-AAI-STREAM); prompt/tool content (DP-INTERVIEWER); screens (DP-UI) | M21–M23, `engine/voice/policy.md` | UI | DP-CONTRACTS, DP-AAI-STREAM, DP-INTERVIEWER (M24 type only) | FR-04, FR-09, NFR-06, NFR-02 |
| 4 | **DP-INTERVIEWER** | Interviewer Engine — LLM Gateway Tool-Calling & Question Policy | `POST /api/turn`; LLM Gateway client; the three tool schemas; question bank + selection policy; system/user prompts; `src/context` buffer use; `engine/agents/index.ts` | Deterministic scoring math (DP-SCORECARD); voice (DP-TURNTAKING) | M24–M29 | TURNTAKING, UI, SCORECARD | DP-CONTRACTS, DP-SCORECARD (M32, M33); C1, C3, C11, C12 | FR-05, FR-06, NFR-01, NFR-02, NFR-05 |
| 5 | **DP-SCORECARD** | Evidence-Backed Scorecard & Re-Drill Selection | Filler lexicon + detection; evidence quote building with `mm:ss` labels; deterministic rubric; LLM/deterministic merge; scorecard aggregation; weakest-answer selection | Any network call. Any React. | M30–M36 | UI, INTERVIEWER, DEMOPROOF | DP-CONTRACTS; C2 | FR-07, FR-08, FR-09, NFR-05 |
| 6 | **DP-UI** | Mockrill React App — Screens, Event Store, Chassis UI Composition | Event bus; dual-source hook; Setup/LiveCall/ScorecardView/Drill/History screens; app entry + `index.html`; theme selection; degraded rendering | Voice mechanics, scoring math, deploy config | M37–M39 | DEPLOY, DEMOPROOF, PITCH | DP-CONTRACTS, DP-AAI-STREAM, DP-TURNTAKING, DP-SCORECARD; C9, C10 | FR-09, FR-10, FR-11, NFR-02 |
| 7 | **DP-DEPLOY** | Vercel Deployment, Routes & Health Smoke | `vercel.json`; `/health`; `build`/`preview` scripts; env wiring and `.env.example` additions; `npm run deploy` + `deploy:verify` runbook; HTTPS/mic verification | Route bodies for `/api/aai-token` and `/api/turn` (their owning plans) | M40, M41, scripts `build`, `preview` | all; submission field 10 | DP-UI, DP-AAI-STREAM, DP-INTERVIEWER; C16 | FR-12, NFR-04, NFR-08 |
| 8 | **DP-DEMOPROOF** | Golden Cache, Mock Envelopes & the 4-Rung Fallback Ladder | Golden session fixture; SSE mock publisher; golden-cache recording + `RES_FORCED_DEGRADED=1` verification; offline build proof; the ladder doc | Video/deck production (DP-PITCH) | M42–M44, scripts `mock:publish`, `golden:record` | UI, PITCH, SUBMIT | DP-CONTRACTS, DP-UI, DP-SCORECARD; C6, C8 | FR-13, NFR-03, NFR-08 |
| 9 | **DP-PITCH** | Deck, Timed Script, Judge Q&A & DEMODRIVE Capture | `deckgen populate`, `script generate` (3–5 min), `faqdef generate` + rehearse, `demodrive capture`; deck→PDF export; 16:9 cover; video shot list | Disclosure/hygiene/license/diagram (DP-SUBMIT) | `deck/`, `script.md`, `docs/qa/`, `assets/demodrive/`, `assets/cover.png`, `docs/video-shotlist.md` | operator, submission fields 5–7 | DP-SUBMIT (needs `disclosure.md` first), DP-DEMOPROOF; C15 | FR-14, §0.3, §0.4 |
| 10 | **DP-SUBMIT** | Disclosure, Hygiene, License, Diagram & 10-Field Submission | `provo generate`/`summary`; `submit format`/`hygiene`; MIT `LICENSE`; spin-up `README.md`; `docs/architecture.mmd` + PNG; `.gitignore` for `private/`; the 10-field paste sheet | Deck/video/Q&A (DP-PITCH) | M45, M46, `disclosure.md`, `architecture-summary.md`, `LICENSE`, `README.md`, `hygiene-report.*` | PITCH, operator | DP-DEPLOY (needs public URL), DP-DEMOPROOF; C13, C14 | FR-15, NFR-07, §0.4 |

**Authoring order (blocking):** 1 → (2, 5) → 4 → 3 → 6 → 7 → 8 → 10 → 9.
Plans 2 and 5 may be authored in parallel once 1 exists. Plan 9 is last because
`faqdef` and `deckgen` consume `disclosure.md` produced by plan 10.

### §3a. Inter-module boundary rule (why §2 + §3 are exhaustive)

This blueprint is the **only** shared context between the independent chats that
author the ten plans, and between the low-intelligence implementors that execute
them. If it is vague, DP-INTERVIEWER will export a `formatTimestamp()` while
DP-SCORECARD independently writes its own, DP-UI will stub a `TranscriptTurn`
because it "needs one now", and the three will never be wired together — the
build compiles, the demo shows three disconnected half-features, and the entry
loses on Application of Technology.

Therefore, binding on every plan author and every implementor:

1. **Single owner, N consumers.** Every row of §2.4 has exactly one owning plan.
   Consumers `import` it from the stated path. Re-declaring, re-typing, stubbing,
   copying, or "temporarily inlining" an owned row is a plan failure.
2. **No invention.** If a needed contract is not in §2.4, the plan author must
   STOP, state the gap explicitly at the top of the plan under
   `## BLUEPRINT GAP`, and design the minimum addition **inside its own
   namespace** — never inside another plan's files.
3. **Consumers-before-providers is illegal.** A plan may not be implemented
   before every plan it depends on (per §3) has been implemented. Each plan's
   first work unit must verify that its dependencies' exports resolve.
4. **Cross-module work units must exercise the real import.** A verification
   command that only tests a plan's own file does not verify a cross-module
   contract; the command must import the provider's real export from the
   provider's real path and assert on its real output.
5. **Chassis is read-only.** No plan edits anything under `src/resilience/`,
   `src/platform/`, `src/context/`, `src/ideation/`, `src/provenance/`,
   `contracts/`, or `assembly.manifest.json`.
6. **Excluded modules do not exist.** `src/media`, `src/cost`, `src/dev`,
   `src/pgm`, `src/profile`, `src/assembly` are absent from this working copy.
   Any plan that imports them fails at build time.

---

## §4. Submission checklist mapping

| # | Submission field (§0.4) | Artifact | Produced by | Command / source |
|---|---|---|---|---|
| 1 | Project title | "Mockrill — Realtime AI Mock-Interview Voice Coach" | DP-SUBMIT | `winning_project_plan.md` front-matter `title` via `submit format` |
| 2 | Short description | 1–2 sentences | DP-SUBMIT | `submit format` from Executive Pitch |
| 3 | Long description | problem / solution / AssemblyAI usage / business value | DP-SUBMIT | `submit format` + `architecture-summary.md` |
| 4 | Technology & category tags | `AssemblyAI`, `Universal-3.5-Pro`, `Realtime STT`, `LLM Gateway`, `Voice Agent`, `Interview Prep` | DP-SUBMIT | `submit format` |
| 5 | Cover image — PNG/JPG **16:9** | `assets/cover.png` (1920×1080) | DP-PITCH | deck slide 01 exported at 16:9 |
| 6 | Video — MP4, **3–5 min** | narrated screen recording over the live demo, DEMODRIVE capture as insurance | DP-PITCH | `script.md` (timed) + `assets/demodrive/` + `docs/video-shotlist.md` |
| 7 | Slides — **PDF** | `deck/mockrill-deck.pdf` | DP-PITCH | `deckgen populate … --out deck/` then export to PDF |
| 8 | Public GitHub repo | this repo, pushed public, MIT | DP-SUBMIT | `LICENSE` + `submit hygiene` secret scan + `README.md` spin-up guide |
| 9 | Demo application platform | "Vercel" | DP-DEPLOY | `npm run deploy` |
| 10 | Application URL | `$PUBLIC_URL` | DP-DEPLOY | `npm run deploy && npm run deploy:verify` → `PASS <ms>` |
| — | Disclosure of pre-built scaffolding | `disclosure.md` (+ `architecture-summary.md`) | DP-SUBMIT | `provo generate --manifest assembly.manifest.json` |
| — | Architecture diagram | `docs/architecture.mmd` → `docs/architecture.png` | DP-SUBMIT | mirrors §2.2; also `deckgen diagram --manifest assembly.manifest.json` |
| — | Judge Q&A sheet | `docs/qa/qa-sheet.md` | DP-PITCH | `faqdef generate …` then `faqdef rehearse --count 5 --budget 90` |
| — | Fallback ladder runbook | `docs/fallback-ladder.md` | DP-DEMOPROOF | see §5.2 |

Exact commands (run from this working copy root, in this order, after any change
to the plan or manifest):

```bash
npx vite-node src/provenance/provo/cli.ts generate --manifest assembly.manifest.json --out disclosure.md
npx vite-node src/provenance/provo/cli.ts summary  --manifest assembly.manifest.json
npx vite-node src/ideation/deckgen/cli.ts populate --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out deck/ --no-llm
npx vite-node src/ideation/script/cli.ts generate --plan winning_project_plan.md --manifest assembly.manifest.json --config my-timing.yaml --out script.md
npx vite-node src/ideation/faqdef/cli.ts generate --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out docs/qa
npx vite-node src/ideation/demodrive/cli.ts capture --script demodrive-script.json --data-source mock --out assets/demodrive --fast --full-page
npx vite-node src/provenance/submit/cli.ts format --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out submission.md
npx vite-node src/provenance/submit/cli.ts hygiene --manifest assembly.manifest.json --out hygiene-report
```

---

## §5. Risks and degraded-demo fallback ladder

### §5.1 Risk register

| # | Risk | Likelihood | Impact | Mitigation | Owning DP |
|---|---|---|---|---|---|
| R-01 | Tracks/sponsor sub-challenges announced after kickoff invalidate §0.2. | Medium | High | Standing instruction in §0.2: re-transcribe the brief and amend this blueprint before further work. Nothing in the build is track-specific, so the code cost of an amendment is zero. | operator |
| R-02 | Voice Agent API / streaming tier not available on a hackathon-grant key. | Medium | High | Path B needs only the streaming endpoint and the LLM Gateway, both on the public tier. Verify on day 0 with a one-line token mint (`curl -H "Authorization: $ASSEMBLYAI_API_KEY" "https://streaming.assemblyai.com/v3/token?expires_in_seconds=60"`). | DP-AAI-STREAM |
| R-03 | Credits exhausted mid-window (Voice Agent API ≈ $4.50/hr; streaming ≈ $0.45/hr). | Medium | High | Path B streaming is 10× cheaper. Always `Terminate` the socket on unmount (billing is on socket-open duration, 3 h auto-close). Rehearse against the golden cache, not live audio. One LLM request per turn (NFR-05). | DP-AAI-STREAM, DP-INTERVIEWER |
| R-04 | Judge's browser blocks the microphone, or the venue network kills the WS. | High | High | The 4-rung ladder in §5.2 — never apologize downward. | DP-DEMOPROOF |
| R-05 | `speechSynthesis` voices are absent or silent on the judge's machine. | Medium | Medium | `createSpeaker().available` is checked at Setup; when false the UI shows the interviewer's question as large on-screen text and the session continues (never blocks). Disclose in Q&A sheet. | DP-TURNTAKING |
| R-06 | Vercel serverless cannot hold a long-lived socket → someone "fixes" it by proxying audio through a function. | Medium | High | §2.1 is binding: audio goes **browser → AssemblyAI**, never through a function. Any plan proposing an audio proxy is rejected. | DP-DEPLOY |
| R-07 | `private/` (this blueprint and the plans) gets pushed to the public repo. | High | Medium | DP-SUBMIT adds `private/` to `.gitignore` in its first work unit and `submit hygiene` verifies it before submission. | DP-SUBMIT |
| R-08 | Duplicate/disconnected implementations across plans (the §3a failure). | High without §2.4 | Critical | §2.4 single-owner table + §3a rules + cross-module verification commands (§3a rule 4). | all |
| R-09 | Prior art: overlapping entries (e.g. "IncidentBridge AI" — evidence-backed voice agent with speaker+timestamp citations; generic interview-prep bots dense among 1,374 builders). | High | Medium | Differentiate on the **re-drill loop** — quote the exact moment, then make the candidate say it again better in the same session. That loop is the demo's spine and the Originality argument in `docs/qa/qa-sheet.md`. | DP-PITCH |
| R-10 | Business Value axis weak because `tam_figure` is unresolved (`grounded: false` in the plan). | High | Medium | Do not invent a TAM. State the named user, the bootcamp-career-services licensing model, and a bottom-up estimate with its arithmetic shown and its assumptions labelled. `pgm`/`profile` are excluded from this working copy, so grounding is a manual research task before the deck is finalized. | DP-PITCH |
| R-11 | Video runs under 3 min or over 5 min → rubric penalty. | Medium | Medium | `script generate --config my-timing.yaml` with total 4:00; `script validate` gates the sum; shot list rehearsed twice before recording. | DP-PITCH |
| R-12 | Deploy blocked late. | Low | High | Deploy at the end of week 2, not week 4. Fallback providers `replit` / `docker` already have adapters in `src/platform/deploy/adapters/`; last resort is documented localhost + video, but field 10 then scores poorly. | DP-DEPLOY |

### §5.2 Degraded-demo fallback ladder (present at the highest rung that works)

| Rung | What the judge sees | How to get there | Depends on |
|---|---|---|---|
| **1 — Live** | Judge talks into their own mic on the public HTTPS URL; transcript ticks; scorecard quotes their own words. | Open `$PUBLIC_URL`, allow mic, click **Start screening call**. | FR-01…FR-09, network + key |
| **2 — Degraded live** | Same URL, same UI, transcript and scorecard appear instantly from the golden session; degraded badge visible and explained as designed behavior. | Set `RES_FORCED_DEGRADED=1` in the deployment env (or the local shell) and reload. Every wrapped call serves its golden cache entry. | NFR-03, M42, golden cache pre-recorded |
| **3 — Recorded capture** | The DEMODRIVE screenshot/video capture recorded in week 4, narrated live. | `assets/demodrive/<timestamp>/` — captured **early**, refreshed weekly. | DP-PITCH, DP-DEMOPROOF |
| **4 — Localhost sync render** | The full UI ticking from mock envelopes on a laptop with no network at all. | `npm run dev` (terminal 1) + `npm run mock:publish` (terminal 2), UI in `source: "stream"` mode. | M43, NFR-08 |

Rule: rehearse rungs 2 and 4 at least once per week from week 2. A rung that has
never been rehearsed is not a rung.

---

## §6. Change control

Any change to §2.4 or §3 invalidates every plan that references the changed row.
Procedure: amend this file, list the affected DP ids in the amendment note, and
re-run the affected `PROMPT-DP-*.md` in a fresh chat. Do not hand-edit a design
plan to match a changed blueprint.

# DP-INTERVIEWER — LLM Gateway Tool-Calling & Question Policy

## §1 Purpose & scope

### §1.1 What this plan delivers

- **Interview engine types `src/mockrill/engine/types.ts` (M24)** — `TurnRequest` and `InterviewerAction` exactly matching `engine/schema/input.schema.json` and `output.schema.json` owned by DP-CONTRACTS; the only types that cross the `POST /api/turn` boundary.
- **Three OpenAI-format tool descriptors `src/mockrill/engine/tools.ts` (M25)** — `SELECT_QUESTION_TOOL`, `SCORE_ANSWER_TOOL`, `TAG_FILLER_TOOL` plus frozen `MOCKRILL_TOOLS` array; each `parameters` is a complete JSON Schema with `type`, `properties`, `required`, `additionalProperties:false` and per-property `description`; `tag_filler` is advisory only with deterministic precedence stated explicitly.
- **AssemblyAI LLM Gateway client `src/mockrill/engine/llmGateway.ts` (M26) → `chatCompletion`** — server-only, one call per turn to `https://llm-gateway.assemblyai.com/v1/chat/completions` with `Authorization: <ASSEMBLYAI_API_KEY>`, model `process.env.MOCKRILL_LLM_MODEL ?? "claude-sonnet-4-6"` plus one retry on `MOCKRILL_LLM_FALLBACK_MODEL ?? "qwen3.5-4b-32k-fast"`, both inside a single `withResilience` wrapper, JSON-string `function.arguments` parsed in try/catch to `makeDegradedResult` never throw.
- **Question bank `engine/rag/question-bank.json` (M29)** — `{ version:"1.0.0", roles: { "junior-frontend": InterviewQuestion[], "junior-backend": InterviewQuestion[], "career-switcher": InterviewQuestion[] } }` with ≥6 questions per role, each 2–3 `follow_ups` and 3–6 `keyterms` feeding `keyterms_prompt` for STT bias; schema plus two fully worked examples and exact acceptance count.
- **Dialogue policy in `engine/agents/index.ts` → `callInterviewer` (M28) and serverless route `api/turn.ts` (M27) → `POST /api/turn`** — 7-step algorithm (buffer build → `fit` with pinned system prompt → one `chatCompletion` → tool-call dispatch → `mergeScores`/`scoreAnswerDeterministic` fallback → deterministic zero-LLM guarantee → `done` after `MAX_QUESTIONS=4`), always-200 degraded bridging, 64 KB truncate, 405 for non-POST, and the two prompt files `engine/prompts/system.interviewer.md` + `engine/prompts/user.turn.md` with complete text.

### §1.2 Explicitly OUT of scope, and which DP owns it instead

| Out-of-scope item | Owning DP | Reason |
|---|---|---|
| Shared contracts M1–M15 (`TranscriptWord`, `TranscriptTurn`, `InterviewQuestion`, `RubricAxis`, `EvidenceQuote`, `FillerHit`, `AnswerScore`, `Scorecard`, `SessionState`, `MOCKRILL_STEP_IDS`, `StepPayloads`, `makeEnvelope`, `formatTimestamp`, `engine/schema/*.json` schemas) | DP-CONTRACTS | Vocabulary and schema ownership; this plan consumes them but never redefines them |
| `GET /api/aai-token`, `createMicSource`, `createStreamingClient` (M16–M20) | DP-AAI-STREAM | Streaming / token / mic |
| `createSpeaker`, `createTurnController`, `TurnControllerDeps` (M21–M23), `MAX_QUESTIONS` constant ownership when moved | DP-TURNTAKING | Turn-taking state machine and TTS; this plan reads `MAX_QUESTIONS=4` but DP-TURNTAKING owns it |
| `FILLER_LEXICON`, `detectFillers`, `buildEvidence`, `scoreAnswerDeterministic`, `mergeScores`, `buildScorecard`, `selectWeakest` (M30–M36) | DP-SCORECARD | Deterministic scoring; this plan imports `mergeScores`/`scoreAnswerDeterministic` but never re-implements them |
| `createEventBus`, `useMockrillEvents`, `main.tsx`/`index.html` (M37–M39) | DP-UI | React/UI; must call `/api/turn` not import `llmGateway` |
| `GET /api/health`, `vercel.json` (M40–M41) | DP-DEPLOY | Deployment |
| `session-golden.json`, `mockrill-mock-publish.ts`, `fallback-ladder.md` (M42–M44), architecture diagram, `submission.md` (M45–M46) | DP-DEMOPROOF / DP-SUBMIT | Demo and submission |

## §2 Requirements

| # | Requirement | Source | Judging axis |
|---|---|---|---|
| R-INT-01 | `src/mockrill/engine/types.ts` defines `TurnRequest = { session_id: string; asked: string[]; last_turn: TranscriptTurn \| null; role: string }` and `InterviewerAction = { say: string; question: InterviewQuestion \| null; score: AnswerScore \| null; done: boolean; degraded: boolean }` exactly as S7 M24, matching `engine/schema/input.schema.json` and `output.schema.json` field-for-field owned by DP-CONTRACTS | S7 M24, M15 | Application of Technology |
| R-INT-02 | `src/mockrill/engine/tools.ts` exports `SELECT_QUESTION_TOOL`, `SCORE_ANSWER_TOOL`, `TAG_FILLER_TOOL` as OpenAI-format `{ type:"function", function:{ name, description, parameters } }` with complete JSON Schema (see §3) and frozen `MOCKRILL_TOOLS` array of all three | S7 M25 | Application of Technology |
| R-INT-03 | `SELECT_QUESTION_TOOL` parameters: `{ question_id: string; rationale: string; is_follow_up: boolean }` with `type:"object"`, `properties` with per-property `description`, `required:["question_id","rationale","is_follow_up"]`, `additionalProperties:false` | S7 M25 | Application of Technology |
| R-INT-04 | `SCORE_ANSWER_TOOL` parameters: `{ structure: integer 0-5; specificity: integer 0-5; clarity: integer 0-5; relevance: integer 0-5; rationale: string; quotes: [{ text: string; why: string }] }` with integer `minimum:0 maximum:5` per axis, `required` includes all axes+rationale+quotes, `additionalProperties:false` | S7 M25 | Application of Technology |
| R-INT-05 | `TAG_FILLER_TOOL` parameters: `{ words: string[] }` advisory only; plan states explicitly deterministic detection in DP-SCORECARD is authoritative and LLM answer is used only to extend lexicon at runtime, never to replace it | S7 M25 | Application of Technology |
| R-INT-06 | `src/mockrill/engine/llmGateway.ts` exports `chatCompletion` that POSTs to `https://llm-gateway.assemblyai.com/v1/chat/completions` with headers `Authorization: <ASSEMBLYAI_API_KEY>` and `Content-Type: application/json`, body `{ model, messages, tools: MOCKRILL_TOOLS, tool_choice:"auto", max_tokens:700 }`, model `process.env.MOCKRILL_LLM_MODEL ?? "claude-sonnet-4-6"`, one retry on `process.env.MOCKRILL_LLM_FALLBACK_MODEL ?? "qwen3.5-4b-32k-fast"`, both inside single `withResilience({ timeout_ms:15000, retries:1, fallback_chain:{ order:["cache","none"] } })` | S7 M26, S5 | Application of Technology |
| R-INT-07 | Tool-call parsing reads `choices[0].message.tool_calls[]` where `function.arguments` is a JSON string parsed inside try/catch; parse failure yields `makeDegradedResult({ reason:"llm_tool_arguments_unparseable", fallback_source:"none" })` never throw; `chatCompletion` is server-only, importing from browser is a defect, DP-UI must call `/api/turn` | S7 M26 | Application of Technology |
| R-INT-08 | `engine/rag/question-bank.json` has shape `{ version:"1.0.0", roles: { "junior-frontend": InterviewQuestion[], "junior-backend": InterviewQuestion[], "career-switcher": InterviewQuestion[] } }` with at least 6 questions per role (≥18 total), each 2–3 `follow_ups` and 3–6 `keyterms`; `keyterms` feed streaming socket `keyterms_prompt` (Application-of-Technology evidence) | S7 M29 | Application of Technology |
| R-INT-09 | `engine/agents/index.ts` exports `callInterviewer` replacing `TODO(ENGINE)` stub but keeping existing `withResilience` wrapper and its config; inner body implements the 7-step dialogue policy; imports `mergeScores`/`scoreAnswerDeterministic` from `src/mockrill/scoring` never re-implements | S7 M28 | Application of Technology |
| R-INT-10 | `api/turn.ts` is `POST /api/turn` with body `TurnRequest` → always `200 InterviewerAction`; non-POST → `405`; body larger than 64 KB → truncate `last_turn.words` to first 400 entries before processing; reads `ASSEMBLYAI_API_KEY` from env, never echoes it; failures return `{ say: <safe bridging line>, question:null, score:null, done:false, degraded:true }` | S7 M27 | Application of Technology |
| R-INT-11 | Dialogue policy algorithm is written as numbered steps 1–7 with no judgment calls: buffer build from `engine/prompts/system.interviewer.md`, `fit` with `model_profile`, `reserved_output:1024`, `strategy:"sliding-window-pinned"`, `warning_threshold:0.8`, one `chatCompletion`, tool-call dispatch, deterministic fallback guaranteeing end-to-end zero-LLM run, `done` after `MAX_QUESTIONS=4` | S7 M24–M29, S4 | Application of Technology |
| R-INT-12 | Prompts `engine/prompts/system.interviewer.md` and `engine/prompts/user.turn.md` replace `.todo.md` stubs; system prompt complete text sets persona (friendly unsentimental screener), caps reply to two short sentences, forbids inventing candidate words, requires tool calling not prose | S7 prompts | Application of Technology |
| R-INT-13 | Every outbound network call wrapped with `withResilience` config `{ timeout_ms:15000, retries:1, fallback_chain:{ order:["cache","none"] } }`; failures become `DegradedResult` never throw to UI | S3 | Application of Technology |
| R-INT-14 | At most one LLM Gateway request per candidate turn; prefers deterministic code | S3 | Application of Technology |
| R-INT-15 | TypeScript strict, ESM, `moduleResolution:NodeNext`, `noUncheckedIndexedAccess:true`, `src/*` alias, chassis imports via barrel `from "src/resilience"` | S3 | Application of Technology |

## §3 Contracts OWNED by this plan

> Rule for every contract below: file path and exported name are exact. Consumers MUST import this from the owning path shown; re-defining, re-typing, stubbing or copying it is a defect.

### M24 `TurnRequest` + `InterviewerAction` — `src/mockrill/engine/types.ts`

- **File:** `src/mockrill/engine/types.ts`
- **Exports:**
  ```ts
  import type { TranscriptTurn, InterviewQuestion, AnswerScore } from "src/mockrill/contracts";
  export type TurnRequest = {
    session_id: string;
    asked: string[];
    last_turn: TranscriptTurn | null;
    role: string; // "junior-frontend" | "junior-backend" | "career-switcher" (validated against question bank keys; unknown falls back to "junior-frontend")
  };
  export type InterviewerAction = {
    say: string;
    question: InterviewQuestion | null;
    score: AnswerScore | null;
    done: boolean;
    degraded: boolean;
  };
  export const MAX_QUESTIONS = 4 as const; // owned by DP-TURNTAKING, duplicated here; if moved to src/mockrill/contracts, import from there
  ```
- **JSON shapes (must match `engine/schema/input.schema.json` and `output.schema.json` owned by DP-CONTRACTS field-for-field):**
  - `TurnRequest` → `{ "session_id": string, "asked": string[], "last_turn": TranscriptTurn|null, "role": string }` with `last_turn` nullable anyOf as in input schema; verification validates a sample against the real schema file.
  - `InterviewerAction` → `{ "say": string, "question": InterviewQuestion|null, "score": AnswerScore|null, "done": boolean, "degraded": boolean }` with nested `InterviewQuestion` and `AnswerScore` shapes identical to M3/M7.
- **Consumers:** M26 `chatCompletion` (receives messages built from `TurnRequest`), M27 `api/turn.ts` (HTTP body), M28 `engine/agents/index.ts` (`callInterviewer` input/output), DP-TURNTAKING `TurnControllerDeps.nextAction`, DP-UI event bus. Consumers MUST import this from `src/mockrill/engine/types.ts`; re-defining or stubbing it is a defect.

### M25 `SELECT_QUESTION_TOOL`, `SCORE_ANSWER_TOOL`, `TAG_FILLER_TOOL`, `MOCKRILL_TOOLS` — `src/mockrill/engine/tools.ts`

- **File:** `src/mockrill/engine/tools.ts`
- **Exports:**
  ```ts
  export const SELECT_QUESTION_TOOL = {
    type: "function" as const,
    function: {
      name: "select_question",
      description: "Select the next interview question from the bank. Must use an id that exists in engine/rag/question-bank.json. Prefer follow_ups when is_follow_up is true.",
      parameters: {
        type: "object",
        properties: {
          question_id: { type: "string", description: "The id of the question to ask next. Must be an id from the question bank for the active role." },
          rationale: { type: "string", description: "One sentence explaining why this question is the right next step for this candidate." },
          is_follow_up: { type: "boolean", description: "True if this is a follow-up to the previous question, false if it is a new top-level question." }
        },
        required: ["question_id", "rationale", "is_follow_up"],
        additionalProperties: false
      }
    }
  };
  export const SCORE_ANSWER_TOOL = {
    type: "function" as const,
    function: {
      name: "score_answer",
      description: "Score the candidate's last answer on four rubric axes. Each axis is an integer 0-5.",
      parameters: {
        type: "object",
        properties: {
          structure: { type: "integer", minimum: 0, maximum: 5, description: "STAR structure: 0 incoherent, 5 clear Situation Task Action Result." },
          specificity: { type: "integer", minimum: 0, maximum: 5, description: "Specificity: 0 vague, 5 concrete with numbers, proper nouns and keyterms." },
          clarity: { type: "integer", minimum: 0, maximum: 5, description: "Clarity: 0 heavy filler, 5 crisp and fluent." },
          relevance: { type: "integer", minimum: 0, maximum: 5, description: "Relevance: 0 off-topic, 5 directly answers the asked question." },
          rationale: { type: "string", description: "One or two sentences justifying the scores and naming the weakest axis." },
          quotes: {
            type: "array",
            description: "At most 2 verbatim excerpts from the candidate's last turn that support the scores.",
            items: {
              type: "object",
              properties: {
                text: { type: "string", description: "Verbatim excerpt from the transcript." },
                why: { type: "string", description: "Why this quote matters for the score." }
              },
              required: ["text", "why"],
              additionalProperties: false
            }
          }
        },
        required: ["structure", "specificity", "clarity", "relevance", "rationale", "quotes"],
        additionalProperties: false
      }
    }
  };
  export const TAG_FILLER_TOOL = {
    type: "function" as const,
    function: {
      name: "tag_filler",
      description: "Tag filler words heard in the last turn. Advisory only — deterministic detection in DP-SCORECARD is authoritative. The LLM answer is used only to extend the lexicon at runtime, never to replace it.",
      parameters: {
        type: "object",
        properties: {
          words: { type: "array", description: "Filler words or phrases detected in the last turn. Each entry should be a lowercase filler token (e.g. 'um', 'kind of').", items: { type: "string" } }
        },
        required: ["words"],
        additionalProperties: false
      }
    }
  };
  export const MOCKRILL_TOOLS = [SELECT_QUESTION_TOOL, SCORE_ANSWER_TOOL, TAG_FILLER_TOOL] as const;
  ```
- **Precedence note (normative):** `tag_filler` is advisory only — deterministic detection in DP-SCORECARD (`detectFillers`/`FILLER_LEXICON`) is authoritative; the LLM's `words` array is used only to extend the lexicon at runtime, never to replace it. State this explicitly in the file header comment.
- **Consumers:** M26 `chatCompletion` (passed as `tools`), M28 `callInterviewer` (parses tool_calls by name), DP-SCORECARD lexicon extension hook. Consumers MUST import this from `src/mockrill/engine/tools.ts`; re-defining or stubbing it is a defect.

### M26 `chatCompletion` — `src/mockrill/engine/llmGateway.ts`

- **File:** `src/mockrill/engine/llmGateway.ts`
- **Exports:**
  ```ts
  import type { Message } from "src/context";
  export type GatewayRequest = { messages: Message[]; model?: string };
  export type GatewayResponse = { content: string | null; tool_calls: Array<{ id: string; name: string; arguments: unknown }> | null; raw: unknown; model: string; degraded: boolean };
  export async function chatCompletion(req: GatewayRequest): Promise<GatewayResponse | DegradedResult<GatewayResponse>>;
  ```
  Internally `chatCompletion` satisfies endpoint `POST https://llm-gateway.assemblyai.com/v1/chat/completions` with headers `Authorization: <ASSEMBLYAI_API_KEY>` and `Content-Type: application/json` and body `{ model, messages, tools: MOCKRILL_TOOLS, tool_choice: "auto", max_tokens: 700 }` where `model = process.env.MOCKRILL_LLM_MODEL ?? "claude-sonnet-4-6"` and on non-2xx or timeout one retry against `process.env.MOCKRILL_LLM_FALLBACK_MODEL ?? "qwen3.5-4b-32k-fast"`; both attempts sit inside the same `withResilience({ timeout_ms:15000, retries:1, fallback_chain:{ order:["cache","none"] } })` wrapper. Tool-call parsing: `choices[0].message.tool_calls[]` where `function.arguments` is a JSON string parsed inside try/catch — parse failure yields `makeDegradedResult({ reason:"llm_tool_arguments_unparseable", fallback_source:"none" })` never throw. Server-side only; importing from browser code is a defect and DP-UI must call `/api/turn` instead (file header must contain `// SERVER-ONLY — do not import from browser; use POST /api/turn`).
- **JSON shapes:** request body as above; response `{ choices:[{ message:{ role:"assistant", content?, tool_calls:[{ id, type:"function", function:{ name, arguments:"<JSON string>" } }] }, finish_reason }], request_id }` per S5.
- **Consumers:** M28 `callInterviewer` (single call per turn), M27 `api/turn.ts` (indirect via `callInterviewer`). Consumers MUST import this from `src/mockrill/engine/llmGateway.ts`; re-defining or stubbing it is a defect.

### M27 `POST /api/turn` — `api/turn.ts`

- **File:** `api/turn.ts`
- **Export:** `export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void>`
- **Signature contract:** `POST /api/turn` with JSON body `TurnRequest` → always `200 InterviewerAction` JSON. Rules: method other than POST → `405 Method Not Allowed` with `Allow: POST`; body larger than 64 KB (measured via `JSON.stringify(req.body).length` or `req.headers["content-length"]`) → truncate `last_turn.words` to first 400 entries before processing (exact number 400); reads `process.env.ASSEMBLYAI_API_KEY` from environment, never echoes it; legitimate request never 4xx/5xx, failures return `{ say: "Let's continue — could you elaborate on that?", question:null, score:null, done:false, degraded:true }` (safe bridging line literal). Import `callInterviewer` from `engine/agents/index.ts` and delegate; if `isDegradedResult` then unwrap to degraded `InterviewerAction`.
- **Consumers:** DP-TURNTAKING `TurnControllerDeps.nextAction`, DP-UI `TurnController`. Consumers MUST call this via `fetch("/api/turn")`; re-implementing the route is a defect.

### M28 `callInterviewer` — `engine/agents/index.ts`

- **File:** `engine/agents/index.ts`
- **Export:** `export const callInterviewer = withResilience(async (req: TurnRequest): Promise<InterviewerAction> => { ... }, { timeout_ms:15000, retries:1, fallback_chain:{ order:["cache","none"] } })` plus named export `export type { TurnRequest, InterviewerAction }` re-export for convenience.
- **Behavior:** replaces the `TODO(ENGINE)` stub, keeps existing `withResilience` wrapper and its config exactly (`timeout_ms:15000, retries:1, fallback_chain:{ order:["cache","none"] }`); inner body implements the 7-step dialogue policy (§5 A1). Imports `chatCompletion` from `src/mockrill/engine/llmGateway.ts`, `MOCKRILL_TOOLS` parsing, `fit` from `src/context`, question bank JSON, and `mergeScores`/`scoreAnswerDeterministic` from `src/mockrill/scoring`. Never re-implements scoring.
- **Consumers:** `api/turn.ts`, DP-TURNTAKING, DP-UI. Consumers MUST import this from `engine/agents/index.ts`; re-defining or stubbing it is a defect.

### M29 `engine/rag/question-bank.json`

- **File:** `engine/rag/question-bank.json`
- **Export:** JSON data file (no TS export) with shape `{ version: "1.0.0", roles: { "junior-frontend": InterviewQuestion[], "junior-backend": InterviewQuestion[], "career-switcher": InterviewQuestion[] } }` where `InterviewQuestion = { id:string; text:string; competency:"behavioral"|"technical"|"situational"; difficulty:1|2|3; follow_ups:string[]; keyterms:string[] }`. At least 6 questions per role (≥18 total), each 2–3 `follow_ups` and 3–6 `keyterms`; `keyterms` feed streaming socket `keyterms_prompt` biasing STT toward domain vocabulary — call this out explicitly, it is Application-of-Technology evidence. Two fully worked example questions must be in the plan (§5). Acceptance count is exact so "enough" is not a judgment call. Replaces `corpus.todo.md` stub.
- **Consumers:** `callInterviewer`, streaming client `keyterms_prompt`, DP-SCORECARD rubric, DP-UI. Consumers MUST import this via `import bank from "engine/rag/question-bank.json"` or `fs.readFileSync`; re-defining a local question list is a defect.

## §4 Contracts CONSUMED by this plan

| # | Import path | Export | Signature | Owning DP |
|---|---|---|---|---|
| C1 | `src/mockrill/contracts` | `TranscriptTurn`, `TranscriptWord` | `TranscriptTurn = { turn_order:number; transcript:string; formatted:boolean; end_of_turn:boolean; end_of_turn_confidence:number; words:TranscriptWord[]; speaker:"candidate"|"interviewer"; received_at:string }` | DP-CONTRACTS M1–M2 |
| C2 | `src/mockrill/contracts` | `InterviewQuestion` | `{ id:string; text:string; competency:"behavioral"|"technical"|"situational"; difficulty:1|2|3; follow_ups:string[]; keyterms:string[] }` | DP-CONTRACTS M3 |
| C3 | `src/mockrill/contracts` | `AnswerScore`, `RubricAxis`, `EvidenceQuote`, `FillerHit` | `AnswerScore = { question_id:string; turn_order:number; axes:Record<RubricAxis,number>; overall:number; rationale:string; evidence:EvidenceQuote[]; source:"llm"|"deterministic" }` | DP-CONTRACTS M4–M7 |
| C4 | `src/mockrill/scoring` | `mergeScores` | `(llm: AnswerScore|null, det: AnswerScore) => AnswerScore` per axis `Math.round((llm+det)/2)`, evidence always `det.evidence` | DP-SCORECARD M33 |
| C5 | `src/mockrill/scoring` | `scoreAnswerDeterministic` | `(turn:TranscriptTurn, q:InterviewQuestion) => AnswerScore` (`source:"deterministic"`) | DP-SCORECARD M32 |
| C6 | `src/mockrill/scoring` | `detectFillers` (indirect, used by deterministic path) | `(turn:TranscriptTurn)=>FillerHit[]` | DP-SCORECARD M30 |
| C7 | `src/resilience` | `withResilience`, `isDegradedResult`, `makeDegradedResult` | `withResilience<T>(fn, config, deps?) => () => Promise<T|DegradedResult<T>>` | chassis `src/resilience` |
| C8 | `src/context` | `fit` | `(buffer:Message[], config?:Partial<ContextBudgetConfig>|null) => { buffer:Message[]; status:BufferStatus }` and `Message`, `ContextBudgetConfig` types | chassis `src/context` |
| C9 | `engine/schema/input.schema.json`, `engine/schema/output.schema.json` | JSON Schema | draft-07 schemas mirroring `TurnRequest`/`InterviewerAction`; verification validates a sample `TurnRequest` against the real file | DP-CONTRACTS M15 |

**Rules:**
- None of the consumed contracts may be re-implemented, re-typed, or stubbed — always import from the canonical path (`from "src/mockrill/contracts"`, `from "src/mockrill/scoring"`, `from "src/resilience"`, `from "src/context"`).
- `scoreAnswerDeterministic` and `mergeScores` MUST be imported, never re-implemented; evidence always comes from `det.evidence` because LLM can hallucinate words/timestamps.
- `TurnRequest`/`InterviewerAction` field-for-field match the engine schemas; adding or renaming a field is a defect.

## §5 Algorithms

### A0 `chatCompletion` internals (M26)

```
1. Build headers: { Authorization: process.env.ASSEMBLYAI_API_KEY, "Content-Type": "application/json" }. Key is read ONLY here and in api/turn.ts; never echoed.
2. Build body: { model: process.env.MOCKRILL_LLM_MODEL ?? "claude-sonnet-4-6", messages, tools: MOCKRILL_TOOLS, tool_choice: "auto", max_tokens: 700 }.
3. Call withResilience(async () => {
     let model = process.env.MOCKRILL_LLM_MODEL ?? "claude-sonnet-4-6";
     let resp = await fetch("https://llm-gateway.assemblyai.com/v1/chat/completions", { method:"POST", headers, body: JSON.stringify({ model, messages, tools: MOCKRILL_TOOLS, tool_choice:"auto", max_tokens:700 }) });
     if (!resp.ok || resp.status >= 400) {
       model = process.env.MOCKRILL_LLM_FALLBACK_MODEL ?? "qwen3.5-4b-32k-fast";
       resp = await fetch("https://llm-gateway.assemblyai.com/v1/chat/completions", { method:"POST", headers, body: JSON.stringify({ model, messages, tools: MOCKRILL_TOOLS, tool_choice:"auto", max_tokens:700 }) });
       if (!resp.ok) throw new Error(`gateway ${resp.status}`);
     }
     const json = await resp.json();
     return json;
   }, { timeout_ms:15000, retries:1, fallback_chain:{ order:["cache","none"] } })
4. If isDegradedResult(res): return res (propagate DegradedResult).
5. Parse tool_calls: calls = json.choices?.[0]?.message?.tool_calls ?? null; if null/empty -> return { content: json.choices[0].message.content, tool_calls:null, raw:json, model, degraded:false }.
6. For each tc in calls: try { args = JSON.parse(tc.function.arguments) } catch(e) { return makeDegradedResult({ reason:"llm_tool_arguments_unparseable", fallback_source:"none", original_error:String(e) }) } never throw.
7. Return { content, tool_calls: calls.map(c=>({ id:c.id, name:c.function.name, arguments: JSON.parse(c.function.arguments) })), raw:json, model, degraded:false }.
8. File header comment: // SERVER-ONLY — do not import from browser; use POST /api/turn — and export is async function chatCompletion only.
```

### A1 Dialogue policy — `callInterviewer(req: TurnRequest): Promise<InterviewerAction | DegradedResult<InterviewerAction>>` (M28)

Numbered steps with zero judgment calls; this is the brain:

```
1. Build Message[] buffer:
   a. Load systemPrompt = fs.readFileSync("engine/prompts/system.interviewer.md","utf8") (pinned, see A2). Build array `buffer: Message[] = [{ role:"system", content: systemPrompt, metadata:{ pinned:true } }]`. Also load userTurnTemplate from engine/prompts/user.turn.md.
   b. For each prior asked id in req.asked order, reconstruct a pair: { role:"user", content: render(userTurnTemplate, { transcript: <the turn transcript for that order if available else "(no transcript)" > }) } and { role:"assistant", content: <the question text for that id from bank> } — when no transcript history is stored (only last_turn is present), synthesize only the last pair from req.last_turn; earlier pairs use transcript "" and are still counted for history length.
   c. If req.last_turn !== null: append final { role:"user", content: render(userTurnTemplate, { role: req.role, transcript: req.last_turn.transcript, turn_order: req.last_turn.turn_order }) }.
   d. Every Message has metadata.timestamp = new Date().toISOString() optionally.

2. Fit it with `fit(buffer, { model_profile: "balanced", reserved_output: 1024, strategy: "sliding-window-pinned", warning_threshold: 0.8 })` from "src/context".
   - model_profile is "balanced" (exists in config/model-profiles.json with context_window 128000). Safe default if missing is "fast" (also 128000). Implementor must verify file rather than invent a key.
   - reserved_output 1024 reserves output budget; warning_threshold 0.8 triggers status.warning:"approaching".
   - fit preserves pinned system message via strategy "sliding-window-pinned" and drops oldest non-pinned pairs first.
   - If fit.status.rejected === true, still proceed with the returned truncated buffer (never abort).

3. Call `chatCompletion({ messages: fittedBuffer, model: undefined })` exactly ONCE per invocation. At most one LLM Gateway request per candidate turn. Await result `gw`.

4. If isDegradedResult(gw): go to step 6 (deterministic fallback) without inspecting tool_calls.

5. If gw.tool_calls !== null:
   a. Find selectCall = gw.tool_calls.find(c => c.name === "select_question"); scoreCall = gw.tool_calls.find(c => c.name === "score_answer"); fillerCall = gw.tool_calls.find(c => c.name === "tag_filler");
   b. If selectCall: let { question_id, rationale, is_follow_up } = selectCall.arguments; resolve `question = lookupQuestionBank(req.role, question_id)` — linear search over bank.roles[req.role]; if id unknown, treat as no usable tool call → go to step 6.
   c. If scoreCall and req.last_turn !== null: let { structure, specificity, clarity, relevance, rationale, quotes } = scoreCall.arguments; clamp each axis to 0-5 integers; build llmScore: AnswerScore = { question_id: (question?.id ?? req.asked[req.asked.length-1] ?? "unknown"), turn_order: req.last_turn.turn_order, axes:{structure,specificity,clarity,relevance}, overall: Math.round(((structure+specificity+clarity+relevance)/4)*10)/10, rationale, evidence: [] /* placeholder, replaced by merge */, source:"llm" }; detScore = scoreAnswerDeterministic(req.last_turn, question ?? fallbackQuestionForScoring(req)); merged = mergeScores(llmScore, detScore); set score = merged.
   d. Else if scoreCall but last_turn is null: ignore scoreCall (no transcript to score), score = null.
   e. If fillerCall: let words = fillerCall.arguments.words as string[]; optionally extend in-memory filler lexicon Set (advisory, never persist, never replace FILLER_LEXICON) — log only.
   f. If question resolved OR score built: construct InterviewerAction { say: gw.content ?? rationale ?? question.text.slice(0,160), question: question ?? null, score: score ?? null, done: isDone(req), degraded:false } where isDone checks req.asked.length + (question?1:0) >= MAX_QUESTIONS (4). If question is still null but policy needs to ask (not done), go to step 6 for question selection but keep score if already built.
   g. If question && isDone -> done true, question may be null on last turn if interview ends; say is bridging closing line.

6. Deterministic fallback when there is no usable tool call, gw is degraded, or the key is missing:
   a. Pick next unasked question from bank in bank order: for q of bank.roles[req.role] ?? bank.roles["junior-frontend"] if q.id not in req.asked, pick first; if all asked, pick first not-asked including follow_ups expansion — if absolutely none, question = null.
   b. If req.last_turn !== null: detScore = scoreAnswerDeterministic(req.last_turn, question ?? bank.roles[req.role][0]); score = detScore; else score = null.
   c. Return { say: question ? question.text : "Thanks for that — let's wrap up with a final reflection. Could you summarize your strongest takeaway from today?", question, score, done: isDone(req), degraded:true }.
   d. This path uses ZERO network. The interview must always be able to run end-to-end with zero LLM availability. State this as acceptance criterion: with RES_FORCED_DEGRADED=1 or ASSEMBLYAI_API_KEY absent, 4 turns still complete, each turn returns degraded:true and a valid question until done.

7. `done` becomes true after MAX_QUESTIONS (4) answered questions, matching DP-TURNTAKING's constant. DP-TURNTAKING owns the constant and this plan reads it from src/mockrill/contracts if it is moved there — otherwise both plans hard-code 4 and the plan says so explicitly. isDone(req) = req.asked.length >= 4 || (req.asked.length + (pickedQuestion?1:0) >= 4 && req.last_turn !== null). On done, question may be null and say is a closing line; downstream buildScorecard will aggregate.
```

### A2 Prompt texts (complete, normative)

**`engine/prompts/system.interviewer.md`:**

```
You are Mockrill, a friendly but unsentimental technical screener for junior engineers and career switchers.

Rules:
- You speak in at most two short sentences per turn. Long TTS output kills pacing, so be concise.
- Never invent or paraphrase the candidate's words. Quote only what the transcript contains.
- Do not answer in prose without tools. You MUST call select_question to choose the next question and score_answer to score the last answer whenever a transcript is present.
- Select questions only by id from the provided bank. If a question_id is unknown, do not guess — the system will fall back deterministically.
- Scoring: each axis (structure, specificity, clarity, relevance) is an integer 0-5. Be honest; do not inflate.
- Tag filler words via tag_filler if you hear them, but do not rely on it — deterministic detection is authoritative.
- If no transcript is provided (first turn), just select the opening question.
```

**`engine/prompts/user.turn.md`:**

```
Role: {{role}}
Turn: {{turn_order}}
Transcript: "{{transcript}}"
Asked so far: {{asked}}
Instruction: Score the last transcript with score_answer (if any) and select the next question with select_question. Respond only via tool calls.
```

Replace `{{role}}`, `{{turn_order}}`, `{{transcript}}`, `{{asked}}` via simple string replacement (no templating library).

### A3 Question-bank shape and keyterms_prompt wiring

- `engine/rag/question-bank.json` version 1.0.0; roles keys exactly "junior-frontend", "junior-backend", "career-switcher".
- Each InterviewQuestion has 2-3 follow_ups (strings) and 3-6 keyterms (strings). Keyterms are the lexicon that the streaming socket sends as `keyterms_prompt` via `createStreamingClient({ keyterms: question.keyterms })` — this biases Universal-Streaming toward domain vocabulary (e.g. React, Kubernetes, Postgres). This is Application-of-Technology evidence: the same keyterms that score relevance also tune STT accuracy.
- Two fully worked example questions (normative patterns implementor copies):

```json
{
  "id": "fe-01",
  "text": "Tell me about a time you debugged a tricky UI bug. What was the symptom, how did you isolate it, and what did you ship?",
  "competency": "behavioral",
  "difficulty": 2,
  "follow_ups": ["What tooling did you use to reproduce it?", "How did you verify the fix didn't regress?"],
  "keyterms": ["React", "reproduce", "regression", "debug", "component"]
}
{
  "id": "be-01",
  "text": "Walk me through how you would design a rate limiter for a public API. What data structures and trade-offs would you consider?",
  "competency": "technical",
  "difficulty": 3,
  "follow_ups": ["How would you handle bursts vs sustained load?", "Where would you store counters?", "How would you test it under load?"],
  "keyterms": ["rate limiter", "token bucket", "Redis", "trade-off", "throughput"]
}
```


## §6 Configuration, environment & files

### Env vars

| Name | Who reads | Default | When missing / fallback |
|---|---|---|---|
| `ASSEMBLYAI_API_KEY` | `api/turn.ts`, `src/mockrill/engine/llmGateway.ts` (server-only) | none — required | Gateway call not attempted; `callInterviewer` takes deterministic fallback (step 6) with `degraded:true`; `api/turn.ts` still returns 200 degraded bridging line; never echoed to client or logs |
| `MOCKRILL_LLM_MODEL` | `llmGateway.ts` | `"claude-sonnet-4-6"` | Primary model for first attempt |
| `MOCKRILL_LLM_FALLBACK_MODEL` | `llmGateway.ts` | `"qwen3.5-4b-32k-fast"` | Second attempt after non-2xx/timeout; both inside same `withResilience` |
| `RES_FORCED_DEGRADED` | chassis `withResilience` | unset | When `=1`, every wrapped call serves golden cache or `DegradedResult`; interview still runs via deterministic fallback |

Only `ASSEMBLYAI_API_KEY` is the runtime secret per S3; no new vendor SDK, no second API key. `MOCKRILL_LLM_*` are optional model selectors. All are server-side only; importing `llmGateway.ts` from browser is a defect.

### Config files

| Path | Purpose | Notes |
|---|---|---|
| `config/model-profiles.json` | Context budget profiles | Must contain `balanced` (128000) and `fast` (128000); `fit` reads `balanced`; safe default `fast` if missing; implementor must verify file rather than invent a key |
| `engine/schema/input.schema.json` | `TurnRequest` JSON Schema | Owned by DP-CONTRACTS; this plan's TS type must match field-for-field |
| `engine/schema/output.schema.json` | `InterviewerAction` JSON Schema | Owned by DP-CONTRACTS |
| `tsconfig.json` / `vite.config.ts` | `src/*` alias, strict, NodeNext | Already configured; no edit needed beyond alias use |

### Complete file map — everything this plan creates or edits

| Path | Action | Description |
|---|---|---|
| `src/mockrill/engine/types.ts` | **CREATE** | M24 `TurnRequest`, `InterviewerAction`, `MAX_QUESTIONS` |
| `src/mockrill/engine/tools.ts` | **CREATE** | M25 three tool descriptors + `MOCKRILL_TOOLS` |
| `src/mockrill/engine/llmGateway.ts` | **CREATE** | M26 `chatCompletion` server-only gateway client |
| `engine/agents/index.ts` | **EDIT** | M28 `callInterviewer` replacing TODO(ENGINE) stub, keeping `withResilience` wrapper |
| `api/turn.ts` | **CREATE** | M27 `POST /api/turn` always-200 route |
| `engine/rag/question-bank.json` | **CREATE** | M29 question bank ≥6 per role, version 1.0.0 |
| `engine/prompts/system.interviewer.md` | **CREATE** | System prompt complete text (replaces `system.todo.md`) |
| `engine/prompts/user.turn.md` | **CREATE** | User turn template (replaces `user.todo.md`) |
| `engine/schema/input.schema.json` | **READ ONLY** | DP-CONTRACTS owns; this plan must match it |
| `engine/schema/output.schema.json` | **READ ONLY** | DP-CONTRACTS owns |
| `private/design_documents/design_plans/DP-INTERVIEWER.md` | **CREATE** | This plan |

## §7 Failure & degradation behavior

| Failure | Detection | DegradedResult reason string | What the user sees | Fallback-ladder rung |
|---|---|---|---|---|
| LLM Gateway non-2xx or timeout on primary model | `fetch` !ok or withResilience timeout | retry once with fallback model; if still failing, `withResilience` yields `DegradedResult` with chassis reason (e.g. `timeout`, `fetch_failed`) | Deterministic question still asked, turn still scored deterministically, `degraded:true` badge | Rung 2 (deterministic fallback) |
| `function.arguments` JSON unparseable | try/catch around `JSON.parse` | `llm_tool_arguments_unparseable`, `fallback_source:"none"` via `makeDegradedResult` | Same as above — never throw, never crash to UI | Rung 2 |
| Unknown `question_id` from tool call | `lookupQuestionBank` returns undefined | not a DegradedResult, treated as no usable tool call → step 6 | Next unasked question in bank order is asked instead | Rung 2 |
| `ASSEMBLYAI_API_KEY` missing / empty | `process.env.ASSEMBLYAI_API_KEY` falsy check | `aai_key_missing` (api/turn) or gateway degraded `none` | 200 with bridging line `Let's continue — could you elaborate on that?`, `degraded:true` | Rung 4 (fully offline) |
| Request body >64 KB | `JSON.stringify(req.body).length > 65536` or `content-length` header | not degraded, truncated deterministically | `last_turn.words` truncated to first 400 entries before scoring; no error to user | N/A |
| Non-POST method on `/api/turn` | `req.method !== "POST"` | not degraded — HTTP error | `405 Method Not Allowed` with `Allow: POST` and `{ error:"method_not_allowed" }` | N/A |
| Context `fit` evicted messages | `fit.status.truncated===true` or `warning:"approaching"` | N/A | Conversation still works, oldest non-pinned pairs dropped; user sees no error | N/A |
| Interview done after 4 questions | `isDone` true | N/A | `done:true`, `question:null` or closing question, `say` is wrap-up line; scorecard ready downstream | N/A |

**Invariant:** `POST /api/turn` always responds `200` with an `InterviewerAction` for legitimate requests; never 4xx/5xx except `405` for wrong method. Every `DegradedResult` becomes `degraded:true` in the returned action. The interview must always run end-to-end with zero LLM availability.

## §8 Public surface & import rules

### What is exported (public surface)

- `src/mockrill/engine/types.ts` → `TurnRequest`, `InterviewerAction`, `MAX_QUESTIONS`
- `src/mockrill/engine/tools.ts` → `SELECT_QUESTION_TOOL`, `SCORE_ANSWER_TOOL`, `TAG_FILLER_TOOL`, `MOCKRILL_TOOLS`
- `src/mockrill/engine/llmGateway.ts` → `chatCompletion`, `GatewayRequest`, `GatewayResponse`
- `engine/agents/index.ts` → `callInterviewer` (withResilience-wrapped)
- `api/turn.ts` → default handler (not a JS import surface, HTTP contract `POST /api/turn`)
- `engine/rag/question-bank.json` → JSON data (imported as JSON)
- `engine/prompts/system.interviewer.md` + `engine/prompts/user.turn.md` → prompt text files (read via `fs.readFileSync` server-side)

### What is internal

- Prompt render helper (string replace), bank lookup helper, `isDone` helper, filler lexicon extension Set — all internal to `callInterviewer` or `llmGateway` modules, not exported.
- Chassis details: `withResilience` config literals, `fit` options, `makeDegradedResult` calls — internal constants.

### Import rules (binding)

1. All other DPs MUST import types via `from "src/mockrill/engine/types.ts"` and tools via `from "src/mockrill/engine/tools.ts"` and `callInterviewer` via `from "engine/agents/index.ts"`; re-defining or stubbing these is a defect.
2. `chatCompletion` is server-only — importing it from browser code (`src/mockrill/ui/*`, `src/mockrill/voice/*`) is a defect; browser must `fetch("/api/turn")` via `nextAction`.
3. `src/mockrill/engine/*` may import only from `src/mockrill/contracts`, `src/mockrill/scoring`, `src/resilience` (barrel `from "src/resilience"`), `src/context`, and relative `./`; no deep chassis imports, no `src/platform`, no `src/media`/`src/cost`/`src/dev` (excluded modules do not exist).
4. `mergeScores` and `scoreAnswerDeterministic` MUST be imported from `src/mockrill/scoring`; re-implementing scoring inside the interviewer is a defect.
5. Question bank is the single source for questions; duplicating questions inline is a defect.
6. `engine/agents/index.ts` MUST keep the existing `withResilience` wrapper shape and config; only the inner async body is replaced.

## §9 Work units

### WU-INT-01 — `src/mockrill/engine/types.ts` (M24) + schema-match verification

- **Goal:** Author `TurnRequest`/`InterviewerAction` exactly as S7 M24 and prove they match the real DP-CONTRACTS schemas.
- **Depends on:** DP-CONTRACTS M15 schemas (`engine/schema/input.schema.json`, `output.schema.json`) — read-only.
- **Files touched:** `src/mockrill/engine/types.ts` (CREATE).
- **Implementation steps:**
  1. Create directory `src/mockrill/engine/`.
  2. Create `types.ts` with header `// DP-INTERVIEWER M24 — TurnRequest/InterviewerAction; must match engine/schema/*.json field-for-field`.
  3. Import `type { TranscriptTurn, InterviewQuestion, AnswerScore } from "src/mockrill/contracts";` via barrel.
  4. Define `export type TurnRequest = { session_id: string; asked: string[]; last_turn: TranscriptTurn | null; role: string; };` and `export type InterviewerAction = { say: string; question: InterviewQuestion | null; score: AnswerScore | null; done: boolean; degraded: boolean; };` plus `export const MAX_QUESTIONS = 4 as const;` with comment about DP-TURNTAKING ownership.
  5. No other exports.
  6. Verify that `engine/schema/input.schema.json` `required` contains exactly `["session_id","asked","last_turn","role"]` and `additionalProperties:false`.
- **Verification command (one runnable line):**
  ```sh
  npx vite-node -e "import fs from 'fs'; import { z } from 'zod'; const schema=JSON.parse(fs.readFileSync('engine/schema/input.schema.json','utf8')); const sample={session_id:'s1',asked:['q1'],last_turn:{turn_order:0,transcript:'hello',formatted:true,end_of_turn:true,end_of_turn_confidence:0.9,words:[{text:'hello',start:0,end:200,confidence:0.99,word_is_final:true}],speaker:'candidate',received_at:new Date().toISOString()},role:'junior-frontend'}; const ok=schema.required.every(k=>k in sample)&&sample.last_turn.words.length===1; console.log('TurnRequest schema-match:'+ok+' '+schema.required.join(','))"
  ```
  *(If `zod` not available, use plain `JSON.parse` + property check; alternative below. The canonical command uses `node -e` so no extra dep is required:)*
  ```sh
  node -e "const fs=require('fs'); const s=JSON.parse(fs.readFileSync('engine/schema/input.schema.json','utf8')); const sample={session_id:'s1',asked:['q1'],last_turn:{turn_order:0,transcript:'hello',formatted:true,end_of_turn:true,end_of_turn_confidence:0.9,words:[{text:'hello',start:0,end:200,confidence:0.99,word_is_final:true}],speaker:'candidate',received_at:new Date().toISOString()},role:'junior-frontend'}; if(!s.required.every(k=>k in sample)) throw new Error('schema mismatch'); console.log('TurnRequest schema-match:true '+s.required.join(','))"
  ```
- **Expected output:**
  ```
  TurnRequest schema-match:true session_id,asked,last_turn,role
  ```
- **Done-when:** `types.ts` compiles with `npx tsc --noEmit`, sample validates against real schema file, `MAX_QUESTIONS` is 4.

### WU-INT-02 — `engine/prompts/*.md` (full text)

- **Goal:** Replace the two `.todo.md` stubs with complete prompt files per §5 A2.
- **Depends on:** none.
- **Files touched:** `engine/prompts/system.interviewer.md` (CREATE), `engine/prompts/user.turn.md` (CREATE).
- **Implementation steps:**
  1. Create directory `engine/prompts/`.
  2. Create `system.interviewer.md` with the complete 10-line system prompt from §5 A2 verbatim (persona, two-sentence cap, forbid inventing words, require tool calls, scoring 0-5, advisory filler).
  3. Create `user.turn.md` with the template from §5 A2 verbatim (`Role: {{role}}` etc.).
  4. Ensure no `.todo.md` files remain referenced; prompts are plain markdown, no frontmatter.
- **Verification command:**
  ```sh
  node -e "const fs=require('fs'); const sys=fs.readFileSync('engine/prompts/system.interviewer.md','utf8'); const usr=fs.readFileSync('engine/prompts/user.turn.md','utf8'); if(!sys.includes('two short sentences')) throw new Error('system prompt incomplete'); if(!usr.includes('{{transcript}}')) throw new Error('user template incomplete'); console.log('prompts ok:'+sys.split(chr='\n').length+' '+usr.split('\n').length)"
  ```
- **Expected output (example, line counts may vary but substrings must match):**
  ```
  prompts ok:10 4
  ```
  *(Exact expected: the `if` checks pass and the `console.log` prints a line starting with `prompts ok:`.)*
- **Done-when:** Both files exist with §5 A2 text, verification prints `prompts ok:` prefix.

### WU-INT-03 — `engine/rag/question-bank.json` (M29) with the stated minimum counts

- **Goal:** Create question bank with ≥6 per role, each 2–3 follow_ups and 3–6 keyterms, wiring `keyterms_prompt` callout.
- **Depends on:** DP-CONTRACTS `InterviewQuestion` type (shape reference).
- **Files touched:** `engine/rag/question-bank.json` (CREATE).
- **Implementation steps:**
  1. Create directory `engine/rag/`.
  2. Create `question-bank.json` with `{ version:"1.0.0", roles:{ "junior-frontend":[...6], "junior-backend":[...6], "career-switcher":[...6] } }`.
  3. Copy the two worked examples from §5 A3 verbatim as the first two entries (fe-01, be-01) then fill the remaining 16 by same pattern: each has `id` unique per role, `text` a spoken question (ending `?`), `competency` one of the three strings, `difficulty` 1|2|3, `follow_ups` 2–3 strings, `keyterms` 3–6 strings that are plausible STT vocabulary.
  4. Add top-level comment via `_comment` field: `"keyterms feed streaming socket keyterms_prompt to bias STT toward domain vocabulary — Application-of-Technology evidence"`.
  5. Validate JSON parses and counts.
- **Verification command:**
  ```sh
  node -e "const b=JSON.parse(require('fs').readFileSync('engine/rag/question-bank.json','utf8')); const roles=Object.keys(b.roles); if(b.version!=='1.0.0') throw new Error('version'); if(roles.length!==3) throw new Error('roles'); for(const r of roles){ if(b.roles[r].length<6) throw new Error(r+' <6'); for(const q of b.roles[r]){ if(q.follow_ups.length<2||q.follow_ups.length>3) throw new Error(q.id+' follow_ups'); if(q.keyterms.length<3||q.keyterms.length>6) throw new Error(q.id+' keyterms'); } } console.log('bank ok:'+roles.join(',')+' '+b.roles['junior-frontend'].length+','+b.roles['junior-backend'].length+','+b.roles['career-switcher'].length)"
  ```
- **Expected output:**
  ```
  bank ok:junior-frontend,junior-backend,career-switcher 6,6,6
  ```
  (or larger, e.g. `7,6,6` is also acceptable; at least `6,6,6` must hold)
- **Done-when:** JSON parses, version 1.0.0, ≥6 per role, 2–3 follow_ups and 3–6 keyterms each, verification prints `bank ok:`.

### WU-INT-04 — `src/mockrill/engine/tools.ts` (M25)

- **Goal:** Author the three OpenAI-format tool descriptors with complete JSON Schema and the frozen `MOCKRILL_TOOLS` array.
- **Depends on:** none (but after WU-INT-01 for type context).
- **Files touched:** `src/mockrill/engine/tools.ts` (CREATE).
- **Implementation steps:**
  1. Create `tools.ts` with header comment stating advisory precedence: `// tag_filler advisory only — deterministic detection in DP-SCORECARD is authoritative; LLM answer used only to extend lexicon at runtime, never to replace it.`
  2. Define `SELECT_QUESTION_TOOL`, `SCORE_ANSWER_TOOL`, `TAG_FILLER_TOOL` literally as in §3 M25 (copy verbatim, including per-property `description`, `required`, `additionalProperties:false`, integer `minimum`/`maximum` for score axes).
  3. Define `export const MOCKRILL_TOOLS = [SELECT_QUESTION_TOOL, SCORE_ANSWER_TOOL, TAG_FILLER_TOOL] as const;`.
  4. No other exports; no imports needed (pure constants).
- **Verification command:**
  ```sh
  npx vite-node -e "import {MOCKRILL_TOOLS, SELECT_QUESTION_TOOL, SCORE_ANSWER_TOOL, TAG_FILLER_TOOL} from 'src/mockrill/engine/tools.ts'; if(MOCKRILL_TOOLS.length!==3) throw new Error('tools len'); if(SELECT_QUESTION_TOOL.function.parameters.additionalProperties!==false) throw new Error('select'); if(SCORE_ANSWER_TOOL.function.parameters.properties.structure.minimum!==0) throw new Error('score'); if(TAG_FILLER_TOOL.function.parameters.required[0]!=='words') throw new Error('filler'); console.log('tools ok:'+MOCKRILL_TOOLS.map(t=>t.function.name).join(','))"
  ```
- **Expected output:**
  ```
  tools ok:select_question,score_answer,tag_filler
  ```
- **Done-when:** File compiles, three tools present with correct schemas, verification prints exact tool names.

### WU-INT-05 — `src/mockrill/engine/llmGateway.ts` (M26) incl. degraded parsing

- **Goal:** Implement `chatCompletion` with the AssemblyAI LLM Gateway contract, fallback model, and JSON-parse degraded path.
- **Depends on:** WU-INT-04 (needs `MOCKRILL_TOOLS`).
- **Files touched:** `src/mockrill/engine/llmGateway.ts` (CREATE).
- **Implementation steps:**
  1. Create `llmGateway.ts` with header `// SERVER-ONLY — do not import from browser; use POST /api/turn`.
  2. Imports: `import { withResilience, isDegradedResult, makeDegradedResult } from "src/resilience";` and `import { MOCKRILL_TOOLS } from "./tools.js";` and `import type { Message } from "src/context";`.
  3. Define `GatewayRequest`/`GatewayResponse` types per §3 M26.
  4. Implement `export async function chatCompletion(req: GatewayRequest): Promise<GatewayResponse | DegradedResult<GatewayResponse>>` per §5 A0: one `withResilience` wrapping both primary and fallback fetch attempts, body with `max_tokens:700`, `tool_choice:"auto"`, headers, `Authorization: <ASSEMBLYAI_API_KEY>`.
  5. Parse `choices[0].message.tool_calls` where `function.arguments` is JSON string inside try/catch → `makeDegradedResult({ reason:"llm_tool_arguments_unparseable", fallback_source:"none" })` never throw.
  6. Return `DegradedResult` passthrough when `isDegradedResult`.
- **Verification command:**
  ```sh
  npx vite-node -e "import { chatCompletion } from 'src/mockrill/engine/llmGateway.ts'; console.log(typeof chatCompletion)"
  ```
- **Expected output:**
  ```
  function
  ```
- **Done-when:** File type-checks, function exists, contains `llm_tool_arguments_unparseable` handling, file contains `SERVER-ONLY` comment.

### WU-INT-06 — the dialogue policy function, verified with a stubbed gateway

- **Goal:** Implement the pure turn-dispatch logic that would normally call the gateway, but verify it with a stubbed `chatCompletion` so no network is needed.
- **Depends on:** WU-INT-01, WU-INT-03, WU-INT-04, WU-INT-05.
- **Files touched:** `engine/agents/index.ts` (EDIT — stub-aware branch already in WU-INT-08, but this WU adds a unit test `tests/mockrill/dialogue.test.ts`).
- **Implementation steps:**
  1. Create `tests/mockrill/dialogue.test.ts` that imports `callInterviewer` and injects a mock `chatCompletion` returning a canned `select_question` tool call with a known `question_id` from the bank, plus a `score_answer` call.
  2. Alternatively, test the pure dispatch function `resolveToolCalls` extracted from `callInterviewer` (if refactored) — assert that when mock returns `question_id:"fe-01"`, the returned `InterviewerAction.question.id === "fe-01"`.
  3. Keep test deterministic, no fetch, no env key needed; set `process.env.MOCKRILL_LLM_MODEL` to a dummy.
- **Verification command:**
  ```sh
  npx vitest run tests/mockrill/dialogue.test.ts
  ```
- **Expected output:**
  ```
   ✓ tests/mockrill/dialogue.test.ts (1 test)
  Test Files  1 passed (1)
       Tests  1 passed (1)
  ```
- **Done-when:** Stubbed gateway test passes, proving tool-call dispatch for `select_question` and `score_answer`.

### WU-INT-07 — the zero-LLM deterministic path end-to-end

- **Goal:** Prove the interview runs 4 turns end-to-end with zero LLM availability, producing `degraded:true` each turn and deterministic scores.
- **Depends on:** WU-INT-08 (callInterviewer), DP-SCORECARD (`scoreAnswerDeterministic`, `mergeScores`).
- **Files touched:** `tests/mockrill/zero-llm.test.ts` (CREATE).
- **Implementation steps:**
  1. Create test that sets `process.env.ASSEMBLYAI_API_KEY = ""` and `process.env.RES_FORCED_DEGRADED = "1"` or mocks `chatCompletion` to return `makeDegradedResult({ reason:"llm_unavailable", fallback_source:"none" })`.
  2. For 4 sequential turns, call `callInterviewer({ session_id:"s1", asked: previouslyPickedIds, last_turn: fakeTurn, role:"junior-frontend" })`, assert each returns `question !== null` (except possibly last `done`), `score !== null`, `degraded===true`, and `done===true` only on the 4th.
  3. Must import real `scoreAnswerDeterministic` indirectly via `callInterviewer`'s deterministic fallback — do not stub scoring.
- **Verification command:**
  ```sh
  npx vitest run tests/mockrill/zero-llm.test.ts
  ```
- **Expected output:**
  ```
   ✓ tests/mockrill/zero-llm.test.ts (1 test)
  Test Files  1 passed (1)
       Tests  1 passed (1)
  ```
- **Done-when:** 4-turn loop completes with `degraded:true`, deterministic questions in bank order, `done` after 4.

### WU-INT-08 — `engine/agents/index.ts` (M28)

- **Goal:** Replace the `TODO(ENGINE)` stub with the real `callInterviewer` keeping the existing `withResilience` wrapper.
- **Depends on:** WU-INT-01, WU-INT-03, WU-INT-04, WU-INT-05, DP-SCORECARD types.
- **Files touched:** `engine/agents/index.ts` (EDIT).
- **Implementation steps:**
  1. Open `engine/agents/index.ts`, keep `import { withResilience, isDegradedResult, makeDegradedResult } from "src/resilience";` and the `withResilience( async (input: unknown)=>..., { timeout_ms:15000, retries:1, fallback_chain:{ order:["cache","none"] } })` wrapper line exactly.
  2. Replace inner async body with the 7-step dialogue policy from §5 A1: build buffer, `fit` with `balanced`/`reserved_output:1024`/`sliding-window-pinned`/`warning_threshold:0.8`, call `chatCompletion` once, dispatch tool calls, fallback to `scoreAnswerDeterministic`/`mergeScores`, handle unknown `question_id`, compute `done` via `MAX_QUESTIONS`.
  3. Add imports: `import { fit } from "src/context"; import { chatCompletion } from "src/mockrill/engine/llmGateway.js"; import bank from "engine/rag/question-bank.json"; import { mergeScores, scoreAnswerDeterministic } from "src/mockrill/scoring"; import type { TurnRequest, InterviewerAction } from "src/mockrill/engine/types.js";`.
  4. Ensure file contains comment `// DP-INTERVIEWER M28 — keep withResilience wrapper config exactly; only inner body was replaced`.
  5. Export `export const callInterviewer = withResilience(...)` and keep `callAgent` alias for backward compat if present.
- **Verification command:**
  ```sh
  npx vite-node -e "import {callInterviewer} from 'engine/agents/index.ts'; console.log(typeof callInterviewer)"
  ```
- **Expected output:**
  ```
  function
  ```
- **Done-when:** File compiles, `callInterviewer` is a function, `isDegradedResult` check present, `mergeScores` imported not re-implemented.

### WU-INT-09 — `api/turn.ts` (M27)

- **Goal:** Implement `POST /api/turn` always-200 route with 405, 64 KB truncate, key-never-echo, bridging fallback.
- **Depends on:** WU-INT-01, WU-INT-08.
- **Files touched:** `api/turn.ts` (CREATE).
- **Implementation steps:**
  1. Create directory `api/`.
  2. Create `turn.ts` with `import type { VercelRequest, VercelResponse } from "@vercel/node"; import { isDegradedResult } from "src/resilience"; import { callInterviewer } from "engine/agents/index.js"; import type { TurnRequest } from "src/mockrill/engine/types.js";`.
  3. Implement `export default async function handler(req, res)`:
     - if `req.method !== "POST"` → `res.status(405).setHeader("Allow","POST").json({ error:"method_not_allowed" }); return;`
     - read `process.env.ASSEMBLYAI_API_KEY` but never echo it; if missing, still proceed (callInterviewer will go degraded).
     - if body length > 64*1024 (via `JSON.stringify(req.body).length`) and `req.body.last_turn?.words` exists, truncate `req.body.last_turn.words = req.body.last_turn.words.slice(0,400)`.
     - `const result = await callInterviewer(req.body as TurnRequest);` if `isDegradedResult(result)` then `res.status(200).json({ say:"Let's continue — could you elaborate on that?", question:null, score:null, done:false, degraded:true });` else `res.status(200).json(result);`
  4. Ensure `Cache-Control: no-store` header.
- **Verification command:**
  ```sh
  npx vite-node -e "import fs from 'fs'; const src=fs.readFileSync('api/turn.ts','utf8'); if(!src.includes('405')) throw new Error('405 missing'); if(!src.includes('400')) throw new Error('400 missing'); if(!src.includes('degraded:true')) throw new Error('degraded missing'); console.log('turn route ok')"
  ```
- **Expected output:**
  ```
  turn route ok
  ```
- **Done-when:** File exists, contains 405, 400 truncate, degraded bridging, always-200 semantics.

## §10 Acceptance criteria

| # | Requirement | Satisfied by | Check |
|---|---|---|---|
| R-INT-01 | TurnRequest/InterviewerAction match schemas | WU-INT-01 | Sample TurnRequest validates against real `engine/schema/input.schema.json`; `npx tsc --noEmit` passes |
| R-INT-02 | Three tool descriptors frozen | WU-INT-04 | `MOCKRILL_TOOLS.length===3`, names `select_question,score_answer,tag_filler` |
| R-INT-03 | select_question schema | WU-INT-04 | `required` + `additionalProperties:false` verified |
| R-INT-04 | score_answer schema | WU-INT-04 | integer min/max 0-5 verified |
| R-INT-05 | tag_filler advisory precedence | WU-INT-04 | Header comment + `words` schema, explicit statement in plan |
| R-INT-06 | chatCompletion gateway contract + fallback + withResilience | WU-INT-05 | `SERVER-ONLY` header, `claude-sonnet-4-6` + `qwen3.5-4b-32k-fast`, `max_tokens:700`, `timeout_ms:15000` present |
| R-INT-07 | Tool-call JSON parse degraded | WU-INT-05 | contains `llm_tool_arguments_unparseable`, `makeDegradedResult`, try/catch |
| R-INT-08 | Question bank ≥6 per role, 2-3 follow_ups, 3-6 keyterms, keyterms_prompt evidence | WU-INT-03 | Node count check `bank ok:junior-frontend,junior-backend,career-switcher 6,6,6` |
| R-INT-09 | callInterviewer keeps withResilience, imports mergeScores/scoreAnswerDeterministic | WU-INT-08 | `typeof callInterviewer === "function"`, imports verified, no scoring re-impl |
| R-INT-10 | POST /api/turn always 200, 405, 64KB→400 truncate, never echo key | WU-INT-09 | `turn route ok` check; manual `curl -X GET` → 405 |
| R-INT-11 | 7-step dialogue policy, fit(balanced,1024,sliding-window-pinned,0.8), one chatCompletion, deterministic zero-LLM guarantee, done after 4 | WU-INT-06 + WU-INT-07 | Stubbed gateway test + zero-LLM 4-turn loop both pass |
| R-INT-12 | Complete prompt texts | WU-INT-02 | `prompts ok:` + two-sentence cap + no-invent-words checks |
| R-INT-13 | withResilience wrapping | WU-INT-05/WU-INT-08/WU-INT-09 | Every fetch wrapped with `{ timeout_ms:15000, retries:1, fallback_chain:{order:["cache","none"]} }` |
| R-INT-14 | One LLM call per turn, deterministic preferred | WU-INT-08 | `chatCompletion` called exactly once per `callInterviewer` invocation |
| R-INT-15 | Strict TS, ESM, NodeNext, noUncheckedIndexedAccess | WU-INT-01 | `npx tsc --noEmit` passes |
| Cross-module | Real `mergeScores` + `scoreAnswerDeterministic` + `TranscriptTurn` verification | WU-INT-06/07 | See cross-module command below: prints `overall:<n> source:<s>` |

**Cross-module verification (normative, must be runnable after WU-INT-07):**

```sh
npx vite-node -e "import { scoreAnswerDeterministic, mergeScores } from 'src/mockrill/scoring'; import type { TranscriptTurn } from 'src/mockrill/contracts'; const turn={turn_order:0, transcript:'When at my project I built an API. We shipped and reduced latency.', formatted:true, end_of_turn:true, end_of_turn_confidence:0.9, words:[{text:'When',start:0,end:100,confidence:0.99,word_is_final:true},{text:'API',start:200,end:300,confidence:0.99,word_is_final:true}], speaker:'candidate', received_at:new Date().toISOString()} as TranscriptTurn; const q={id:'fe-01', text:'Tell me about a time you debugged a UI bug.', competency:'behavioral', difficulty:2, follow_ups:['How did you reproduce it?'], keyterms:['API','latency']} as any; const det=scoreAnswerDeterministic(turn,q); const merged=mergeScores(null, det); console.log('overall:'+merged.overall+' source:'+merged.source)"
```

**Expected output:**

```
overall:3 source:deterministic
```
*(Exact `overall` may be 2.5–3.5 depending on deterministic axis arithmetic, but `source:deterministic` is invariant when `mergeScores(null, det)` is called. The plan pins `overall:3` as the expected value for the literal fixture above; implementor must match the rubric buckets from DP-SCORECARD so this fixture yields 3. If the rubric changes, the expected stdout in the test must be updated to the actual computed `overall` and the plan's verification line updated to that number — the invariant is that `source` is `deterministic`.)*

## §11 Non-goals

- No audio capture, WebSocket streaming, mic permissions, `AudioWorklet`, or STT handling — owned by DP-AAI-STREAM.
- No `speechSynthesis` / `createSpeaker`, no `createTurnController` state machine, no barge-in / VAD — owned by DP-TURNTAKING.
- No filler lexicon engineering, evidence templating, rubric weight tuning, or scorecard aggregation beyond calling `mergeScores`/`scoreAnswerDeterministic` — owned by DP-SCORECARD.
- No React components, event bus, `useMockrillEvents`, theme, or `index.html` — owned by DP-UI.
- No `GET /api/health`, `vercel.json`, or deployment — owned by DP-DEPLOY.
- No golden fixture, SSE replay, `mockrill-mock-publish`, or `fallback-ladder.md` — owned by DP-DEMOPROOF.
- No diagram or submission doc — owned by DP-SUBMIT.
- No new vendor SDK, no second API key, no `localStorage`-dependent behavior, no `src/media`/`src/cost`/`src/dev` imports.

## §12 Open questions

| # | Question | Safe default chosen in this plan |
|---|---|---|
| Q1 | What if `config/model-profiles.json` lacks `balanced`? | Use `fast` (128000) as safe default; implementor must verify file rather than invent a key. |
| Q2 | Should `MOCKRILL_LLM_MODEL` env var be required? | No — defaults to `claude-sonnet-4-6`; fallback to `qwen3.5-4b-32k-fast`. Both are paid AssemblyAI Gateway models under the single `ASSEMBLYAI_API_KEY`. |
| Q3 | How to handle `role` not in question bank? | Fall back to `junior-frontend` bank for question selection and scoring; do not throw. |
| Q4 | Should `callInterviewer` persist lexicon extension from `tag_filler`? | No persistence — in-memory Set only, advisory, never overwrites `FILLER_LEXICON`; log count only. Deterministic detection remains authoritative. |
| Q5 | Who owns `MAX_QUESTIONS` if DP-TURNTAKING moves it? | DP-TURNTAKING owns the constant; this plan reads it from `src/mockrill/contracts` if migrated, otherwise both hard-code `4` and this plan states so explicitly. |
| Q6 | Token counting for `fit` — which model profile tokens? | `balanced` (128k) via generic adapter; `reserved_output:1024` leaves headroom for tool calls; `warning_threshold:0.8`. |
| Q7 | Should `api/turn.ts` validate `TurnRequest` with `withValidation`? | Optional — `withResilience` is sufficient for this plan; if `withValidation` is added, it must use `engine/schema/input.schema.json` and still return degraded 200 on validation failure, never 400. |


# DP-UI — Screens, Event Store & Chassis UI Composition

## §1 Purpose & scope

### §1.1 What this plan delivers

- **In-memory event bus M37 (`src/mockrill/ui/eventBus.ts`)** — dependency-free pub/sub over `EventEnvelope` with synchronous ordered delivery, snapshot/reset, and a single exported singleton `mockrillBus` shared by voice layer and React tree.
- **Dual-source event hook M38 (`src/mockrill/ui/useMockrillEvents.ts`)** — one hook, two sources (`live` via bus, `stream` via chassis `useEventStream`), returning `UseEventStreamResult` imported from chassis, with source resolution `?source=stream` URL param → `MOCKRILL_SOURCE` Vite env → default `"live"`.
- **App entry M39 (`src/mockrill/ui/main.tsx` + repo-root `index.html`)** — mounts `<App/>` into `#root`, re-points script src from `/examples/ui/dev-main.tsx` to `/src/mockrill/ui/main.tsx`, title `Mockrill — Realtime AI Mock-Interview Voice Coach`, with rationale that `/examples/` is git-ignored.
- **Five screens** — Setup, LiveCall, ScorecardView, Drill, History — each with exact props, state, rendered elements (including chassis `StreamingTextRenderer`, `StepStatusIndicator`, `CitationDisplay` with adapter), and degraded-banner handling.
- **Degraded rendering (NFR-02) across all screens** — uses `isDegradedEnvelope` / `degradedResultOf` from `src/platform/ui`, persistent amber banner `"Running on cached session data"` plus reason, never a blocking modal.
- **Offline build-and-render guarantee** — whole app builds and renders with no network via `npm run build` + `npm run preview` with mock publisher (fallback ladder rung 4).

### §1.2 Explicitly OUT of scope, and which DP owns it instead

| Out-of-scope item | Owning DP | Reason |
|---|---|---|
| `TranscriptWord`, `TranscriptTurn`, `InterviewQuestion`, `RubricAxis`, `EvidenceQuote`, `FillerHit`, `AnswerScore`, `Scorecard`, `SessionState`, `MOCKRILL_STEP_IDS`, `MockrillStepId`, `StepPayloads`, `makeEnvelope`, `formatTimestamp`, `engine/schema/*.json` (M1–M15) | DP-CONTRACTS | Vocabulary / pure helpers; UI imports them, never re-declares |
| `GET /api/aai-token`, `createMicSource`, `createStreamingClient`, `StreamingClientOptions` (M16–M20) | DP-AAI-STREAM | Mic + streaming; UI only consumes `createStreamingClient` indirectly via turnController |
| `createSpeaker`, `createTurnController`, `TurnControllerDeps`, browser `speechSynthesis` wrapper (M21–M23) | DP-TURNTAKING | Voice turn-taking; UI wires `drill()` and `speak` but does not re-implement |
| `TurnRequest`, `InterviewerAction`, tool descriptors, `chatCompletion`, `POST /api/turn`, `callInterviewer`, `engine/rag/question-bank.json` (M24–M29) | DP-INTERVIEWER | LLM/orchestration; UI reaches LLM only via `POST /api/turn`, never imports `llmGateway.ts` |
| `FILLER_LEXICON`, `detectFillers`, `buildEvidence`, `scoreAnswerDeterministic`, `mergeScores`, `buildScorecard`, `selectWeakest` (M30–M36) | DP-SCORECARD | Scoring logic; UI imports from `src/mockrill/scoring` only |
| `GET /api/health`, `vercel.json` (M40–M41) | DP-DEPLOY | Deployment / health; UI build must pass `npm run build` but does not own vercel config |
| `fixtures/mockrill/session-golden.json`, `scripts/mockrill-mock-publish.ts`, `docs/fallback-ladder.md` (M42–M44) | DP-DEMOPROOF | Offline replay fixture + mock publisher (SSE on 8787) that UI consumes via `source=stream` |
| `docs/architecture.mmd`, `submission.md` (M45–M46) | DP-SUBMIT | Submission artifacts |
| Any `withResilience` wrapping, `ASSEMBLYAI_API_KEY` reading, scoring or filler detection logic | DP-INTERVIEWER / DP-AAI-STREAM / DP-SCORECARD | UI is presentation only; never wraps network or re-implements scoring |

## §2 Requirements

| # | Requirement | Source | Judging axis |
|---|---|---|---|
| R-UI-01 | `src/mockrill/ui/eventBus.ts` exports `createEventBus()` returning `{ emit, subscribe, snapshot, reset }` and a module-level singleton `mockrillBus`; `emit` appends to internal array and notifies subscribers synchronously in registration order; throwing subscriber is caught/logged and does not break others; `snapshot()` returns a copy; `reset()` clears array and subscribers | S7 M37 | Presentation |
| R-UI-02 | `src/mockrill/ui/useMockrillEvents.ts` exports one hook `useMockrillEvents` with two sources returning `UseEventStreamResult` imported from chassis (`src/platform/transport` or `src/platform/ui` barrel) — not re-declared: `source:"stream"` delegates entirely to chassis `useEventStream({url})` and returns its result unchanged (rung 4); `source:"live"` subscribes to bus, accumulates envelopes sorted by `sequence`, derives `degraded` as any envelope has `degraded===true`, reports `status:"open"`, `error:null`, `reconnect()` is no-op that calls `bus.reset()` | S7 M38 | Presentation |
| R-UI-03 | Source resolution order is literally: `?source=stream` URL query param wins; else Vite env var `MOCKRILL_SOURCE` (`import.meta.env.MOCKRILL_SOURCE`); else default `"live"` | S7 M38 | Presentation |
| R-UI-04 | `src/mockrill/ui/main.tsx` mounts `<App/>` into `#root`; repo-root `index.html` has `<script type="module" src="/src/mockrill/ui/main.tsx">` and `<title>Mockrill — Realtime AI Mock-Interview Voice Coach</title>`; plan states why: `/examples/` is git-ignored so entry there would not reach public GitHub repo (submission field 8) | S7 M39 | Presentation |
| R-UI-05 | Setup screen: role selector from three roles in `engine/rag/question-bank.json`, mic permission test, `speechSynthesis` availability check, theme selector calling `setTheme` from `src/platform/ui`, primary button "Start screening call"; when TTS unavailable show banner "Voice output unavailable — questions will appear as text" and continue | handout 5 screens §1 | Presentation |
| R-UI-06 | LiveCall screen: ticking transcript using chassis `StreamingTextRenderer` for in-progress turn and plain list for finalized turns; `StepStatusIndicator` for `SessionState` badge; live elapsed timer; current question display; `latency_ms` from `question-asked` payload in small text as sub-second proof | handout 5 screens §2 | Presentation |
| R-UI-07 | ScorecardView: per question four axis bars, `overall`, evidence quotes rendered with chassis `CitationDisplay` (with adapter if `Citation` shape ≠ `EvidenceQuote`); every quote shows `label` (`mm:ss`) prominently; single "Re-drill this answer" button on weakest question wired to `turnController.drill(questionId)` | handout 5 screens §3 | Presentation |
| R-UI-08 | Drill screen: original quote, target, live transcript of attempt N, before/after axis comparison once scored | handout 5 screens §4 | Presentation |
| R-UI-09 | History screen: list of completed sessions held in memory for session only; explicitly no `localStorage` dependence for core behavior — if used at all wrapped in try/catch and UI renders correctly when empty or throws | handout 5 screens §5 | Presentation |
| R-UI-10 | Degraded rendering (NFR-02): every screen handles degraded envelope using `isDegradedEnvelope` and `degradedResultOf` from `src/platform/ui`; exact treatment is persistent amber banner reading "Running on cached session data" plus `DegradedResult.reason`, never a blocking modal | handout Degraded rendering | Presentation |
| R-UI-11 | Non-negotiables: UI never imports `src/mockrill/engine/llmGateway.ts` (server-only) and never reads `ASSEMBLYAI_API_KEY`; reaches LLM only via `POST /api/turn`; never re-implements scoring, filler detection, timestamp formatting or envelope construction — imports from `src/mockrill/scoring` and `src/mockrill/contracts`; themes via `setTheme` in `src/platform/ui`; React 19 + existing Vite only; builds with no network | handout Non-negotiables | Application of Technology |
| R-UI-12 | Verification: at least one `jsdom` + `@testing-library/react` test fed literal `EventEnvelope[]` built with real `makeEnvelope` from `src/mockrill/contracts` and asserting on visible text with exact expected output in plan; at least one `npm run build` with expected success line | handout Mandatory work units intro + S8 | Presentation |

## §3 Contracts OWNED by this plan

> Rule for every contract below: file path and exported name are exact. Consumers MUST import this from the owning path shown; re-defining, re-typing, stubbing or copying it is a defect.

### M37 `createEventBus`, `MockrillEventBus`, `mockrillBus` — `src/mockrill/ui/eventBus.ts`

- **File:** `src/mockrill/ui/eventBus.ts`
- **Exports:**
  ```ts
  import type { EventEnvelope } from "src/platform/transport";
  export type MockrillEventBus = {
    emit(env: EventEnvelope): void;
    subscribe(cb: (env: EventEnvelope) => void): () => void;
    snapshot(): EventEnvelope[];
    reset(): void;
  };
  export function createEventBus(): MockrillEventBus;
  export const mockrillBus: MockrillEventBus; // module-level singleton created by createEventBus()
  ```
- **Behavior:** dependency-free in-memory pub/sub over `EventEnvelope` (see §5 A1). `emit` appends to internal `EventEnvelope[]` array and notifies subscribers synchronously in registration order; a throwing subscriber is caught via `try/catch`, logged via `console.error`, and never breaks others. `snapshot()` returns a shallow copy (`[...arr]`). `reset()` clears both array and subscribers (`arr.length=0; subs.length=0` or new arrays). `mockrillBus` is the only singleton in the app — voice layer (`src/mockrill/voice/turnController.ts`) and React tree share it without prop-drilling.
- **JSON shapes:** input/output are chassis `EventEnvelope` objects (see C1). No new JSON schema.
- **Consumers:** DP-TURNTAKING (`turnController` emits), DP-UI `useMockrillEvents` (subscribes), `src/mockrill/ui/App.tsx` and all screens (via hook), tests.
- **Import rule:** `import { createEventBus, mockrillBus } from "src/mockrill/ui/eventBus.js";` or `import type { MockrillEventBus } from "src/mockrill/ui/eventBus.js";` — Consumers MUST import this from `src/mockrill/ui/eventBus`; re-defining or stubbing it is a defect.

### M38 `useMockrillEvents` — `src/mockrill/ui/useMockrillEvents.ts`

- **File:** `src/mockrill/ui/useMockrillEvents.ts`
- **Exports:**
  ```ts
  import { useEventStream } from "src/platform/transport"; // or src/platform/ui — whichever barrel re-exports it; plan fixes to "src/platform/transport"
  import type { UseEventStreamResult } from "src/platform/transport"; // MUST import type, do NOT re-declare
  import type { MockrillEventBus } from "./eventBus.js";
  import { mockrillBus } from "./eventBus.js";
  export function useMockrillEvents(opts?: { source?: "live" | "stream"; bus?: MockrillEventBus; url?: string }): UseEventStreamResult;
  export function resolveMockrillSource(): "live" | "stream"; // exported helper for testability, same resolution logic
  ```
- **Signature detail:** `UseEventStreamResult` is imported from chassis, not re-declared. Its shape (from S6) is `{ envelopes: EventEnvelope[]; status: "connecting"|"open"|"closed"|"error"; error: Error|null; degraded: boolean; reconnect(): void; }` — if chassis uses slightly different names, the imported type is still used verbatim; plan does not invent a duplicate.
- **Behavior (see §5 A2):**
  - `source: "stream"` → delegate entirely to chassis `useEventStream({ url })` and return its result unchanged (fallback ladder rung 4).
  - `source: "live"` → subscribe to `bus` (default `mockrillBus`), accumulate envelopes sorted by `sequence`, derive `degraded` as `envelopes.some(e => e.degraded === true)`, report `status: "open"`, `error: null`, `reconnect()` is no-op that calls `bus.reset()`.
  - Source resolution order literally: `new URLSearchParams(window.location.search).get("source") === "stream" ? "stream" : (import.meta.env.MOCKRILL_SOURCE === "stream" ? "stream" : "live")`. If `opts.source` is explicitly passed it wins over auto-resolution.
- **Consumers:** `src/mockrill/ui/App.tsx` and every screen (Setup reads status, LiveCall/Scorecard/Drill/History read envelopes).
- **Import rule:** `import { useMockrillEvents } from "src/mockrill/ui/useMockrillEvents.js";` — Consumers MUST import this from `src/mockrill/ui/useMockrillEvents`; re-defining or stubbing it is a defect. `UseEventStreamResult` MUST be imported from chassis.

### M39 App entry — `src/mockrill/ui/main.tsx` and repo-root `index.html`

- **Files:** `src/mockrill/ui/main.tsx` (CREATE), `index.html` (EDIT)
- **Exports:**
  ```ts
  // src/mockrill/ui/main.tsx
  import React from "react";
  import { createRoot } from "react-dom/client";
  import App from "./App.js";
  // side-effect CSS import if needed: import "./styles.css"; but no new CSS framework
  const rootEl = document.getElementById("root")!;
  createRoot(rootEl).render(<React.StrictMode><App /></React.StrictMode>);
  ```
  No exported type — this is the Vite entry.
- **index.html changes:**
  - `<title>` must be exactly `Mockrill — Realtime AI Mock-Interview Voice Coach`
  - `<script type="module" src="/src/mockrill/ui/main.tsx"></script>` (was `/examples/ui/dev-main.tsx`)
  - Must retain `<div id="root"></div>`
- **Why it matters (must appear as comment in plan and code comment in main.tsx):** `/examples/` is git-ignored in this repo, so an app entry living there would not reach the public GitHub repo required by submission field 8. The entry MUST live under `src/`.
- **Consumers:** Vite build (`vite build` reads `index.html` script src), browser, Vercel static hosting.
- **Import rule:** Vite and browser load `main.tsx` via `index.html`; app code imports `App` from `./App.js`.

### M39b `App.tsx` shell + five screens (owned UI components)

This plan owns the React app shell and all five screens. Each is a named export with exact props/state/rendered elements (see §5 for algorithms). Files:

| File | Export | Props | Notes |
|---|---|---|---|
| `src/mockrill/ui/App.tsx` | `export default function App()` | no props | Shell: resolves source via `resolveMockrillSource()`, calls `useMockrillEvents`, derives degraded/session state, renders `isDegradedEnvelope` banner, routes among screens via local `useState<Screen>` where `type Screen = "setup" | "live" | "scorecard" | "drill" | "history"` |
| `src/mockrill/ui/screens/Setup.tsx` | `export function Setup(props: SetupProps)` | `{ onStart: (role: string) => void; }` | Role selector (3 roles from question-bank), mic test, TTS check, theme selector, Start button; banner when TTS unavailable |
| `src/mockrill/ui/screens/LiveCall.tsx` | `export function LiveCall(props: LiveCallProps)` | `{ envelopes: EventEnvelope[]; sessionState: SessionState; }` | `StreamingTextRenderer`, `StepStatusIndicator`, timer, current question, `latency_ms` |
| `src/mockrill/ui/screens/ScorecardView.tsx` | `export function ScorecardView(props: ScorecardViewProps)` | `{ scorecard: Scorecard; onDrill: (questionId: string) => void; }` + evidence adapter | Four axis bars, overall, `CitationDisplay` per evidence quote, `label mm:ss`, Re-drill button on weakest |
| `src/mockrill/ui/screens/Drill.tsx` | `export function Drill(props: DrillProps)` | `{ question: InterviewQuestion; originalQuote: EvidenceQuote; attemptTranscript: string; before: AnswerScore; after: AnswerScore|null; }` | Original quote, target, live transcript, before/after comparison |
| `src/mockrill/ui/screens/History.tsx` | `export function History(props: HistoryProps)` | `{ sessions: Scorecard[]; }` | Held in memory only; no localStorage for core behavior |
| `src/mockrill/ui/components/DegradedBanner.tsx` | `export function DegradedBanner(props: { reason: string|null })` | `{ reason }` | Persistent amber banner "Running on cached session data" + reason |
| `src/mockrill/ui/adapters/citationAdapter.ts` | `export function toCitation(q: EvidenceQuote): Citation` | — | Adapter from `EvidenceQuote` to chassis `Citation` (see §5 A7) |

Consumers MUST import these from their owned paths; re-defining or stubbing them is a defect.

## §4 Contracts CONSUMED by this plan

| # | Import path | Export | Signature | Owning module / DP |
|---|---|---|---|---|
| C1 | `src/platform/transport` | `EventEnvelope` (type) | `{ step_id: string; status: "started"|"streaming"|"done"|"error"; payload: Record<string,unknown>; timestamp: string; sequence: number; trace_id?: string; degraded?: boolean }` | chassis transport |
| C2 | `src/platform/transport` | `useEventStream` | `(opts?: SubscribeOptions) => UseEventStreamResult` where `SubscribeOptions={url?, traceId?, transport?, fallback?, apiBase?, onEnvelope?, onError?, onDegraded?}` | chassis transport |
| C3 | `src/platform/transport` | `UseEventStreamResult` (type) | `{ envelopes: EventEnvelope[]; status: "connecting"|"open"|"closed"|"error"; error: Error|null; degraded: boolean; reconnect(): void }` | chassis transport |
| C4 | `src/platform/ui` | `StreamingTextRenderer` | React component — read real file `src/platform/ui/StreamingTextRenderer.tsx` before wiring; typically `(props: { text: string; isStreaming: boolean })` or envelope-aware | chassis UI |
| C5 | `src/platform/ui` | `StepStatusIndicator` | React component — read `src/platform/ui/StepStatusIndicator.tsx` | chassis UI |
| C6 | `src/platform/ui` | `CitationDisplay` | React component — read `src/platform/ui/CitationDisplay.tsx` for exact `Citation` shape; if `Citation !== EvidenceQuote` use adapter `toCitation` | chassis UI |
| C7 | `src/platform/ui` | `setTheme`, `currentTheme`, `resolveTheme` | `setTheme(id: "minimal"|"editorial"|"operator"): void` | chassis UI |
| C8 | `src/platform/ui` | `isDegradedEnvelope`, `degradedResultOf` | `isDegradedEnvelope(env: EventEnvelope): boolean`, `degradedResultOf(env): DegradedResult|null` | chassis UI |
| C9 | `src/mockrill/contracts` | `makeEnvelope`, `formatTimestamp`, `MOCKRILL_STEP_IDS`, `MockrillStepId`, `StepPayloads` | see DP-CONTRACTS | DP-CONTRACTS |
| C10 | `src/mockrill/contracts` | `TranscriptTurn`, `InterviewQuestion`, `AnswerScore`, `Scorecard`, `EvidenceQuote`, `SessionState`, `RubricAxis` | types | DP-CONTRACTS |
| C11 | `src/mockrill/scoring` | `detectFillers`, `buildEvidence`, `scoreAnswerDeterministic`, `mergeScores`, `buildScorecard`, `selectWeakest` | see DP-SCORECARD | DP-SCORECARD |
| C12 | `src/mockrill/voice` | `createTurnController` | `(deps: TurnControllerDeps) => { start, stop, drill, state, on }` | DP-TURNTAKING |
| C13 | `engine/rag/question-bank.json` | data `{ version: string; roles: Record<string, InterviewQuestion[]> }` | JSON data | DP-INTERVIEWER |

**Rules:** This plan MUST NOT re-implement, re-type, or stub any of the above. `UseEventStreamResult` MUST be imported, not re-declared. `EventEnvelope`, `InterviewQuestion`, `Scorecard`, `EvidenceQuote`, `formatTimestamp` MUST be imported from owning paths. The chassis components' real props MUST be read from `src/platform/ui/*.tsx` before wiring; if `Citation` != `EvidenceQuote`, the adapter in §5 A7 is used. No import of `src/mockrill/engine/llmGateway.ts` or `ASSEMBLYAI_API_KEY`.

## §5 Algorithms

### A1 `createEventBus` — `src/mockrill/ui/eventBus.ts`

```
state:
  envelopes: EventEnvelope[] = []
  subscribers: ((env: EventEnvelope)=>void)[] = []

createEventBus():
  return {
    emit(env: EventEnvelope): void {
      // 1. envelopes.push(env)
      // 2. for (const cb of [...subscribers]) { try { cb(env) } catch (e) { console.error("[mockrillBus] subscriber threw", e) } }
      //    Use copy [...subscribers] so unsubscribe during notify does not break iteration.
      //    Order is registration order (array append order). Synchronous, no setTimeout/Promise.
    },
    subscribe(cb): () => void {
      // 1. subscribers.push(cb)
      // 2. return () => { const i = subscribers.indexOf(cb); if (i !== -1) subscribers.splice(i,1) }
    },
    snapshot(): EventEnvelope[] { return [...envelopes] },
    reset(): void { envelopes = []; subscribers = []; // or lengths =0 }
  }

mockrillBus = createEventBus() // module-level singleton; the only singleton in the app
```

Constants: none. Logging uses `console.error` literally.

### A2 `useMockrillEvents` — dual-source hook

```
export function resolveMockrillSource(): "live" | "stream" {
  // 1. if typeof window !== "undefined" && new URLSearchParams(window.location.search).get("source") === "stream" return "stream"
  // 2. if (import.meta.env.MOCKRILL_SOURCE === "stream") return "stream"
  // 3. return "live"
}

export function useMockrillEvents(opts?: { source?: "live"|"stream"; bus?: MockrillEventBus; url?: string }): UseEventStreamResult {
  const source = opts?.source ?? resolveMockrillSource()
  const url = opts?.url ?? "/events/stream"
  const bus = opts?.bus ?? mockrillBus
  // To satisfy rules-of-hooks, both hooks are called unconditionally:
  const streamResult = useEventStream({ url }) // chassis hook
  const [liveEnvelopes, setLiveEnvelopes] = useState<EventEnvelope[]>(() => [...bus.snapshot()].sort((a,b)=>a.sequence-b.sequence))
  useEffect(() => {
    const unsub = bus.subscribe((env) => setLiveEnvelopes(prev => [...prev, env].sort((a,b)=>a.sequence-b.sequence)))
    return unsub
  }, [bus])
  if (source === "stream") return streamResult
  // live path:
  const degraded = liveEnvelopes.some(e => e.degraded === true)
  return { envelopes: liveEnvelopes, status: "open", error: null, degraded, reconnect: () => bus.reset() }
}
```

Rules: `envelopes` sorted by `sequence` ascending on every emit. `degraded` is strict `=== true`. `status` is literal `"open"` for live, `error` is `null`, `reconnect()` calls `bus.reset()`.

### A3 App shell — `src/mockrill/ui/App.tsx`

```
type Screen = "setup" | "live" | "scorecard" | "drill" | "history"

export default function App() {
  const { envelopes, status, error, degraded, reconnect } = useMockrillEvents()
  const sessionState: SessionState = deriveSessionState(envelopes)
  const degradedReason = (()=>{ const d=envelopes.find(isDegradedEnvelope); return d ? degradedResultOf(d)?.reason ?? null : null })()
  const [screen, setScreen] = useState<Screen>("setup")
  const [sessions, setSessions] = useState<Scorecard[]>([])
  const [activeScorecard, setActiveScorecard] = useState<Scorecard|null>(null)
  const [drillContext, setDrillContext] = useState<{question: InterviewQuestion; quote: EvidenceQuote; before: AnswerScore}|null>(null)
  // effect: when scorecard-ready envelope appears, setActiveScorecard and push to sessions
  useEffect(()=>{
    const scEnv = [...envelopes].reverse().find(e=>e.step_id==="scorecard-ready")
    if(scEnv){ const sc=(scEnv.payload as any).scorecard as Scorecard; setActiveScorecard(sc); setSessions(prev=> prev.find(s=>s.session_id===sc.session_id)?prev:[...prev, sc]) }
  },[envelopes])
  return (
    <div>
      {degraded && <DegradedBanner reason={degradedReason} />}
      {screen==="setup" && <Setup onStart={role=>{ setScreen("live"); /* turnController.start(role) */ }} onHistory={()=>setScreen("history")}/> }
      {screen==="live" && <LiveCall envelopes={envelopes} sessionState={sessionState} />}
      {screen==="scorecard" && activeScorecard && <ScorecardView scorecard={activeScorecard} onDrill={qid=>{ setDrillContext(...); setScreen("drill"); /* turnController.drill(qid) */}} />}
      {screen==="drill" && drillContext && <Drill {...drillContext} envelopes={envelopes} />}
      {screen==="history" && <History sessions={sessions} />}
    </div>
  )
}
function deriveSessionState(envelopes: EventEnvelope[]): SessionState {
  if(envelopes.length===0) return "idle"
  const last=envelopes[envelopes.length-1]!
  switch(last.step_id){
    case "session-start": return "connecting"
    case "mic-capture": return last.status==="error"?"failed":"listening"
    case "transcript-partial": return "listening"
    case "transcript-final": return "thinking"
    case "question-asked": return "speaking"
    case "answer-scored": return "scoring"
    case "scorecard-ready": return "complete"
    case "drill-start": return "listening"
    case "session-end": return (last.payload as any).reason==="error"?"failed":"complete"
    default: return "idle"
  }
}
```

No `localStorage` for routing or history; if used at all wrap in try/catch.

### A4 Setup screen — `src/mockrill/ui/screens/Setup.tsx`

Props: `{ onStart: (role: string)=>void; onHistory?: ()=>void }`
State: `selectedRole:string|null`, `micOk:boolean|null`, `ttsAvailable:boolean`, `theme:ThemeId`, `testing:boolean`
Render:
1. Role selector: `import qb from "engine/rag/question-bank.json"` — `Object.keys(qb.roles)` yields exactly three roles; `<select>` or radio group value `selectedRole`.
2. Mic test: button "Test microphone" → `navigator.mediaDevices.getUserMedia({audio:true}).then(s=>{s.getTracks().forEach(t=>t.stop()); setMicOk(true)}).catch(()=>setMicOk(false))`; show "Microphone ready" / "Microphone unavailable".
3. TTS check: `useEffect(()=> setTtsAvailable(typeof window!=="undefined" && "speechSynthesis" in window),[])`; if `!ttsAvailable` show `<div role="alert">Voice output unavailable — questions will appear as text</div>` exact text, non-blocking.
4. Theme selector: `import { setTheme, currentTheme } from "src/platform/ui"`; `<select value={theme} onChange={e=>{setTheme(e.target.value); setThemeState(e.target.value)}}>` options `minimal`/`editorial`/`operator`.
5. Primary button: `<button onClick={()=>onStart(selectedRole!)} disabled={!selectedRole}>Start screening call</button>` exact label.

### A5 LiveCall screen — `src/mockrill/ui/screens/LiveCall.tsx`

Props: `{ envelopes: EventEnvelope[]; sessionState: SessionState }`
State: `elapsedMs:number` tick every `1000` ms from `session-start` timestamp.
Derive: `partialTurn` = last `transcript-partial` payload.turn; `finalizedTurns` = envelopes filter `transcript-final`; `currentQuestion` = last `question-asked` payload.question; `latencyMs` = last `question-asked` payload.latency_ms.
Render:
1. `<StepStatusIndicator status={sessionState} />`
2. Timer: `formatTimestamp(elapsedMs)` imported from `src/mockrill/contracts` — label `Elapsed: mm:ss`, interval `1000` ms.
3. Current question: `<h2>{currentQuestion?.text ?? "Waiting for question…"}</h2>`
4. latency: if `latencyMs!=null` → `<small>Latency: {latencyMs} ms</small>`
5. In-progress: if `partialTurn` then `<StreamingTextRenderer text={partialTurn.transcript} isStreaming={true} />` (if component takes envelope, pass envelope instead — read real props).
6. Finalized: `<ul>{finalizedTurns.map(t=><li key={t.turn_order}>{t.transcript} — {formatTimestamp(t.words[0]?.start ?? 0)}</li>)}</ul>`

### A6 ScorecardView — `src/mockrill/ui/screens/ScorecardView.tsx`

Props: `{ scorecard: Scorecard; onDrill: (questionId:string)=>void }`
Derive: `weakestId = selectWeakest(scorecard) ?? scorecard.weakest_question_id` (`selectWeakest` from `src/mockrill/scoring`).
Per question (`scorecard.per_question.map`):
1. Four axis bars: for `axis` in `["structure","specificity","clarity","relevance"]` → `<div><span>{axis}</span><progress value={score.axes[axis]} max={5} /></div>`
2. Overall: `<strong>Overall: {score.overall}</strong>`
3. Evidence: `score.evidence.map(q=> <CitationDisplay citations={[toCitation(q)]} />)` plus prominent `<span>{q.label}</span>` (mm:ss).
4. Weakest question shows: `<button onClick={()=>onDrill(weakestId!)}>Re-drill this answer</button>` exact label, wired to `turnController.drill(questionId)` via prop.

### A7 CitationDisplay adapter — `src/mockrill/ui/adapters/citationAdapter.ts`

Read `src/platform/ui/CitationDisplay.tsx` for exact `Citation` shape. Generic adapter:
```ts
import type { Citation } from "src/platform/ui" // if exported there; else read file
import type { EvidenceQuote } from "src/mockrill/contracts"
export function toCitation(q: EvidenceQuote): Citation {
  // If Citation already has { text, start_ms, end_ms, label, note, kind } return q as unknown as Citation (identity)
  // Else map: return { id: `${q.start_ms}-${q.end_ms}`, text: q.text, source: q.note, timestamp: q.label } as unknown as Citation
  // After reading real props, implement literally to match required Citation fields, preserving label mm:ss
  return { quote: q.text, label: q.label, start_ms: q.start_ms, end_ms: q.end_ms, note: q.note, kind: q.kind } as unknown as Citation
}
```
Adapter belongs to DP-UI; consumers MUST import `toCitation` from this path.

### A8 Drill — `src/mockrill/ui/screens/Drill.tsx`

Props: `{ question: InterviewQuestion; originalQuote: EvidenceQuote; target: string; attemptTranscript: string; isStreaming: boolean; before: AnswerScore; after: AnswerScore|null }`
Render:
1. Original quote: `<blockquote>{originalQuote.text} — {originalQuote.label}</blockquote>`
2. Target: `<p>Target: {target}</p>`
3. Live transcript: `<StreamingTextRenderer text={attemptTranscript} isStreaming={isStreaming} />`
4. Before/after table once `after !== null`:
```
<table><thead><tr><th>Axis</th><th>Before</th><th>After</th></tr></thead>
<tbody>{["structure","specificity","clarity","relevance"].map(axis=><tr><td>{axis}</td><td>{before.axes[axis]}</td><td>{after.axes[axis]}</td></tr>)}</tbody></table>
```
Wiring: `turnController.drill(questionId)` emits `drill-start`; App derives drill props from envelopes.

### A9 History — `src/mockrill/ui/screens/History.tsx`

Props: `{ sessions: Scorecard[] }` — held in memory only.
Render: if `sessions.length===0` → `<p>No sessions yet</p>` else `<ul>{sessions.map(s=><li key={s.session_id}>{s.session_id} — Overall {s.overall} — {formatTimestamp(s.duration_ms)} — {s.per_question.length} questions</li>)}</ul>`
If `localStorage` used at all: wrap in `try{ localStorage.getItem(...) } catch{}` and `try{ setItem } catch{}`; core list rendering works when empty or throws.

### A10 DegradedBanner — `src/mockrill/ui/components/DegradedBanner.tsx`

```ts
export function DegradedBanner(props: { reason: string|null }) {
  return <div role="alert" style={{background:"#f59e0b", color:"black", padding:"8px"}}>Running on cached session data{props.reason ? `: ${props.reason}` : ""}</div>
}
```
Persistent amber banner, never a blocking modal. Every screen renders it when `degraded` or `isDegradedEnvelope` true; reason is `degradedResultOf(env)?.reason` verbatim.

## §6 Configuration, environment & files

### Env vars

| Name | Who reads it | Default | What happens when missing |
|---|---|---|---|
| `MOCKRILL_SOURCE` (Vite env, `import.meta.env.MOCKRILL_SOURCE`) | `src/mockrill/ui/useMockrillEvents.ts` (`resolveMockrillSource`) | `"live"` | Falls back to `"live"` |
| `ASSEMBLYAI_API_KEY` | Never read by UI — server-only | n/a | UI must not import it; reaches LLM only via `POST /api/turn` |

Resolution order literally: `?source=stream` URL param wins → `MOCKRILL_SOURCE === "stream"` → default `"live"`. No other env vars owned.

### Config files

- `vite.config.ts` — already has `src` alias; this plan does NOT edit vite config beyond ensuring `index.html` entry is `/src/mockrill/ui/main.tsx`.
- `tsconfig.json` — already `strict:true`, `moduleResolution:NodeNext`, `noUncheckedIndexedAccess:true`, `jsx:react-jsx`, `paths:{"src/*":["./src/*"]}`; no edit.
- `index.html` — edited by this plan (M39): script src and title.
- `engine/rag/question-bank.json` — read-only data consumed by Setup.

### Complete file map — everything this plan creates or edits

| Path | Action | Description |
|---|---|---|
| `src/mockrill/ui/eventBus.ts` | **CREATE** | M37 `createEventBus`, `MockrillEventBus`, `mockrillBus` singleton |
| `src/mockrill/ui/useMockrillEvents.ts` | **CREATE** | M38 hook + `resolveMockrillSource` |
| `src/mockrill/ui/main.tsx` | **CREATE** | M39 entry mounts `<App/>` into `#root` |
| `src/mockrill/ui/App.tsx` | **CREATE** | App shell, screen router, degraded banner, sessionState derivation |
| `src/mockrill/ui/screens/Setup.tsx` | **CREATE** | Setup (role selector, mic test, TTS banner, theme selector, Start button) |
| `src/mockrill/ui/screens/LiveCall.tsx` | **CREATE** | LiveCall (StreamingTextRenderer, StepStatusIndicator, timer, latency) |
| `src/mockrill/ui/screens/ScorecardView.tsx` | **CREATE** | ScorecardView (axis bars, overall, CitationDisplay+adapter, Re-drill) |
| `src/mockrill/ui/screens/Drill.tsx` | **CREATE** | Drill view (original quote, target, transcript, before/after table) |
| `src/mockrill/ui/screens/History.tsx` | **CREATE** | History list (in-memory only, try/catch if localStorage touched) |
| `src/mockrill/ui/components/DegradedBanner.tsx` | **CREATE** | Persistent amber banner + reason |
| `src/mockrill/ui/adapters/citationAdapter.ts` | **CREATE** | `toCitation(q: EvidenceQuote): Citation` adapter |
| `index.html` | **EDIT** | Change script src to `/src/mockrill/ui/main.tsx`, title to `Mockrill — Realtime AI Mock-Interview Voice Coach` |
| `tests/mockrill/ui/eventBus.test.ts` | **CREATE** | Unit test for eventBus (WU-UI-01) |
| `tests/mockrill/ui/useMockrillEvents.test.tsx` | **CREATE** | Hook test (WU-UI-02) |
| `tests/mockrill/ui/screens.test.tsx` | **CREATE** | jsdom + @testing-library/react screen render test fed real `makeEnvelope` envelopes |
| `private/design_documents/design_plans/DP-UI.md` | **CREATE** | this plan |

## §7 Failure & degradation behavior

| # | Failure | Detection | DegradedResult reason string | What the user sees | Fallback-ladder rung |
|---|---|---|---|---|---|
| F-UI-01 | Subscriber throws during `emit` | `try/catch` around `cb(env)` in A1 | n/a (logged to `console.error`, not a DegradedResult) | Other subscribers still notified; offending subscriber's error logged but UI keeps ticking | n/a — in-memory bus |
| F-UI-02 | Degraded envelope arrives (`env.degraded===true`) | `isDegradedEnvelope(env)` / `envelopes.some(e=>e.degraded===true)` / `degradedResultOf(env)?.reason` | Whatever `reason` the producer set (e.g. `"cache"`, `"secondary_provider"`, `"none"`) | Persistent amber banner `Running on cached session data: <reason>` at top of every screen; no blocking modal, ever | Rung 1–3 (provider/cache/replay) — UI only renders, DP-INTERVIEWER/DP-AAI-STREAM produce degraded |
| F-UI-03 | `speechSynthesis` unavailable | `"speechSynthesis" in window` check in Setup A4 | n/a | Banner `Voice output unavailable — questions will appear as text` (exact text) and continue; questions rendered as text | n/a |
| F-UI-04 | Mic permission denied / `getUserMedia` rejects | `.catch(()=>setMicOk(false))` in Setup | n/a | Text `Microphone unavailable`; user can still proceed to screening with text input / mock | n/a |
| F-UI-05 | `localStorage` throws or empty | `try/catch` wrapper around any `localStorage.getItem/setItem` in History/App | n/a | History renders `No sessions yet` or in-memory list; core behavior not blocked | n/a |
| F-UI-06 | SSE stream (`source=stream`) disconnects / `useEventStream` status `error`/`closed` | chassis `useEventStream` returns `{status:"error", error}` | chassis `DegradedResult.reason` if fallback served | Chassis `useEventStream` degraded flag drives same amber banner; `reconnect()` from chassis reconnects | Rung 4 — `useEventStream` delegation, exact `source:"stream"` path |
| F-UI-07 | `POST /api/turn` fails (turnController fallback) | turnController receives `DegradedResult<InterviewerAction>` from withResilience | e.g. `"cache"`, `"none"` | Question/score still rendered from degraded payload; banner shows reason; demo keeps ticking | Rung 1–2 |
| F-UI-08 | `CitationDisplay` shape mismatch (`Citation !== EvidenceQuote`) | Adapter `toCitation` casts; if chassis `Citation` shape differs, adapter maps fields | n/a | Evidence still renders; `label mm:ss` always shown prominently via adapter | n/a |

Invariant: no failure in UI produces a blocking modal; degraded banner is persistent, amber (`#f59e0b` or Tailwind `amber-500`), `role="alert"`, and shows `DegradedResult.reason` after colon.

## §8 Public surface & import rules

### What is exported (public surface)

- `src/mockrill/ui/eventBus.ts` → `createEventBus`, `mockrillBus` (value), `MockrillEventBus` (type)
- `src/mockrill/ui/useMockrillEvents.ts` → `useMockrillEvents`, `resolveMockrillSource`
- `src/mockrill/ui/App.tsx` → default `App`
- `src/mockrill/ui/screens/Setup.tsx` → `Setup`
- `src/mockrill/ui/screens/LiveCall.tsx` → `LiveCall`
- `src/mockrill/ui/screens/ScorecardView.tsx` → `ScorecardView`
- `src/mockrill/ui/screens/Drill.tsx` → `Drill`
- `src/mockrill/ui/screens/History.tsx` → `History`
- `src/mockrill/ui/components/DegradedBanner.tsx` → `DegradedBanner`
- `src/mockrill/ui/adapters/citationAdapter.ts` → `toCitation`
- `src/mockrill/ui/main.tsx` → no export (Vite entry)

### What is internal

- No barrel `src/mockrill/ui/index.ts` required; each file imported directly via `src/mockrill/ui/<path>.js`. If barrel added, it MUST re-export only the above and not create a second bus.
- Internal helpers: `deriveSessionState` inside `App.tsx`, elapsed timer handle, `weakestId` derivation — not exported.

### Import rules (binding)

1. All UI imports of `EventEnvelope`, `UseEventStreamResult`, `useEventStream` MUST be from `src/platform/transport` — never stubbed.
2. `UseEventStreamResult` MUST be imported as type, never re-declared: `import type { UseEventStreamResult } from "src/platform/transport";` required in `useMockrillEvents.ts`.
3. All UI imports of `StreamingTextRenderer`, `StepStatusIndicator`, `CitationDisplay`, `setTheme`, `isDegradedEnvelope`, `degradedResultOf` MUST be from `src/platform/ui`.
4. All UI imports of `makeEnvelope`, `formatTimestamp`, `InterviewQuestion`, `Scorecard` etc. MUST be from `src/mockrill/contracts`; scoring helpers from `src/mockrill/scoring`, not re-implemented.
5. UI MUST NOT import `src/mockrill/engine/llmGateway.ts` or read `ASSEMBLYAI_API_KEY` — grep `src/mockrill/ui/` for that string must be zero.
6. Deep imports inside UI allowed only as `src/mockrill/ui/<subpath>.js` with `.js` extension for NodeNext ESM; no `src/platform` deep file imports — only barrel paths.
7. `mockrillBus` is the only singleton; do not create another bus elsewhere.

## §9 Work units

### WU-UI-01 — `eventBus.ts` (M37) + tests

- **Goal:** Implement dependency-free in-memory pub/sub with synchronous ordered delivery, snapshot/reset, singleton.
- **Depends on:** DP-CONTRACTS (EventEnvelope type).
- **Files touched:** `src/mockrill/ui/eventBus.ts` (CREATE), `tests/mockrill/ui/eventBus.test.ts` (CREATE)
- **Implementation steps:**
  1. Create `src/mockrill/ui/` directory.
  2. Create `eventBus.ts` with `import type { EventEnvelope } from "src/platform/transport"` plus exact type `MockrillEventBus` and `createEventBus` implementing A1 literally (array, copy on emit, try/catch + console.error, snapshot copy, reset clears).
  3. Export `const mockrillBus = createEventBus()` as module-level singleton with comment `// the only singleton in the app — shared by voice layer and React tree without prop-drilling`.
  4. Create `tests/mockrill/ui/eventBus.test.ts` asserting: emit notifies in order and throwing subscriber does not break others (spy console.error), snapshot returns copy, reset clears.
  5. Ensure no other imports, no `ASSEMBLYAI_API_KEY`.
- **Verification command:**
  ```sh
  npx vitest run tests/mockrill/ui/eventBus.test.ts
  ```
- **Expected output (tail):**
  ```
   ✓ tests/mockrill/ui/eventBus.test.ts (3 tests)
  Test Files  1 passed (1)
       Tests  3 passed (3)
  ```
- **Done-when:** File compiles, singleton exists, throw-not-break asserted, snapshot copy and reset pass.

### WU-UI-02 — `useMockrillEvents.ts` (M38), including real chassis `useEventStream` delegation

- **Goal:** One hook, two sources, one return shape (`UseEventStreamResult` imported, not re-declared).
- **Depends on:** WU-UI-01 (bus), DP-CONTRACTS.
- **Files touched:** `src/mockrill/ui/useMockrillEvents.ts` (CREATE), `tests/mockrill/ui/useMockrillEvents.test.tsx` (CREATE)
- **Implementation steps:**
  1. Create file with imports: `import { useEventStream } from "src/platform/transport"` and `import type { UseEventStreamResult } from "src/platform/transport"` (must appear literally), plus bus imports.
  2. Implement `resolveMockrillSource()` exactly per A2 (URL param → Vite env → live).
  3. Implement `useMockrillEvents` per A2: call `useEventStream({url})` and live state unconditionally, branch on source, live path accumulates sorted by sequence, degraded via `some(e=>e.degraded===true)`, `status:"open"`, `error:null`, `reconnect:()=>bus.reset()`.
  4. Create test rendering component using `useMockrillEvents({source:"live", bus})`, emitting via `bus.emit(makeEnvelope(...))`, asserting envelopes grow and degraded flips.
  5. Assert `UseEventStreamResult` is imported not declared: grep file contains `import type { UseEventStreamResult }`.
- **Verification command:**
  ```sh
  npx vitest run tests/mockrill/ui/useMockrillEvents.test.tsx
  ```
- **Expected output (tail):**
  ```
   ✓ tests/mockrill/ui/useMockrillEvents.test.tsx (2 tests)
  Test Files  1 passed (1)
       Tests  2 passed (2)
  ```
- **Done-when:** Hook compiles, imports real chassis `useEventStream` and `UseEventStreamResult`, live path behavior asserted.

### WU-UI-03 — app shell, `main.tsx`, `index.html` re-point (M39)

- **Goal:** Vite entry moved from `/examples/` to `src/`.
- **Depends on:** none.
- **Files touched:** `src/mockrill/ui/main.tsx` (CREATE), `src/mockrill/ui/App.tsx` (CREATE), `index.html` (EDIT)
- **Implementation steps:**
  1. Create `App.tsx` implementing A3 (Screen state, useMockrillEvents, degradedReason via isDegradedEnvelope/degradedResultOf, routing).
  2. Create `main.tsx` with comment `/examples/ is git-ignored so entry must live under src/ to reach public GitHub repo (submission field 8)` and mounting `createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>)`.
  3. Edit `index.html`: set `<title>Mockrill — Realtime AI Mock-Interview Voice Coach</title>` exactly, and `<script type="module" src="/src/mockrill/ui/main.tsx"></script>` (replace `/examples/ui/dev-main.tsx`). Retain `<div id="root"></div>`.
- **Verification command:**
  ```sh
  node -e "const fs=require('fs'); const html=fs.readFileSync('index.html','utf8'); if(!html.includes('/src/mockrill/ui/main.tsx')) throw new Error('script src not re-pointed'); if(!html.includes('Mockrill — Realtime AI Mock-Interview Voice Coach')) throw new Error('title wrong'); console.log('M39 OK: '+html.match(/<title>.*<\\/title>/)[0])"
  ```
- **Expected output:**
  ```
  M39 OK: <title>Mockrill — Realtime AI Mock-Interview Voice Coach</title>
  ```
- **Done-when:** `main.tsx` mounts App into #root, `index.html` script src and title correct, comment about git-ignored present.

### WU-UI-04 — Setup screen

- **Goal:** Role selector (three roles), mic test, TTS check, theme selector, Start button.
- **Depends on:** WU-UI-03.
- **Files touched:** `src/mockrill/ui/screens/Setup.tsx` (CREATE)
- **Implementation steps:**
  1. Implement per A4: props `{onStart:(role:string)=>void}`, import qb from `engine/rag/question-bank.json`, render three roles.
  2. Mic button with getUserMedia and micOk state.
  3. TTS check via `speechSynthesis in window`, banner exact text `Voice output unavailable — questions will appear as text` with `role="alert"`.
  4. Theme selector calling `setTheme` from `src/platform/ui` with minimal/editorial/operator.
  5. Primary button `Start screening call` disabled until role selected.
- **Verification command:**
  ```sh
  npx vitest run tests/mockrill/ui/screens.test.tsx -t "Setup shows roles and TTS banner"
  ```
- **Expected output (tail):**
  ```
   ✓ tests/mockrill/ui/screens.test.tsx (1 test)
  ```
- **Done-when:** Setup renders three roles, TTS banner exact text, theme selector calls setTheme, Start button label.

### WU-UI-05 — LiveCall screen

- **Goal:** Ticking transcript with StreamingTextRenderer + finalized list, StepStatusIndicator, timer, latency_ms.
- **Depends on:** WU-UI-01/02.
- **Files touched:** `src/mockrill/ui/screens/LiveCall.tsx` (CREATE)
- **Implementation steps:**
  1. Implement per A5: derive partialTurn, finalizedTurns, currentQuestion, latencyMs.
  2. Use `import { StreamingTextRenderer, StepStatusIndicator } from "src/platform/ui"` and `import { formatTimestamp } from "src/mockrill/contracts"`.
  3. Elapsed timer setInterval 1000 ms from first envelope timestamp; display `Elapsed: {formatTimestamp(elapsed)}`.
  4. Render StepStatusIndicator, StreamingTextRenderer for partial, plain ul for finalized, `<small>Latency: {latencyMs} ms</small>`.
- **Verification command:**
  ```sh
  npx vitest run tests/mockrill/ui/screens.test.tsx -t "LiveCall shows StreamingTextRenderer and latency"
  ```
- **Expected output (tail):**
  ```
   ✓ tests/mockrill/ui/screens.test.tsx (1 test)
  ```
- **Done-when:** LiveCall imports chassis components and formatTimestamp, renders latency_ms in small text.

### WU-UI-06 — ScorecardView + the CitationDisplay adapter

- **Goal:** Payoff screen with four axis bars, overall, evidence via CitationDisplay, label mm:ss, Re-drill button.
- **Depends on:** DP-SCORECARD selectWeakest, chassis CitationDisplay shape.
- **Files touched:** `src/mockrill/ui/screens/ScorecardView.tsx` (CREATE), `src/mockrill/ui/adapters/citationAdapter.ts` (CREATE)
- **Implementation steps:**
  1. Read `src/platform/ui/CitationDisplay.tsx` for Citation shape.
  2. Implement `citationAdapter.ts` per A7: `toCitation(q: EvidenceQuote): Citation` preserving label mm:ss; if Citation matches EvidenceQuote then identity cast.
  3. Implement ScorecardView per A6: per question four progress bars, Overall, evidence via CitationDisplay+label, single button `Re-drill this answer` on weakest only calling onDrill.
  4. Import selectWeakest from src/mockrill/scoring.
- **Verification command:**
  ```sh
  npx vitest run tests/mockrill/ui/screens.test.tsx -t "ScorecardView renders axis bars and re-drill"
  ```
- **Expected output (tail):**
  ```
   ✓ tests/mockrill/ui/screens.test.tsx (1 test)
  ```
- **Done-when:** Adapter exists, ScorecardView renders four bars, overall, label mm:ss, Re-drill button on weakest.

### WU-UI-07 — Drill screen and the re-drill wiring

- **Goal:** Re-attempt view: original quote, target, live transcript, before/after comparison.
- **Depends on:** WU-UI-06, DP-TURNTAKING turnController.drill.
- **Files touched:** `src/mockrill/ui/screens/Drill.tsx` (CREATE), `src/mockrill/ui/App.tsx` (EDIT)
- **Implementation steps:**
  1. Implement Drill.tsx per A8 with blockquote, target paragraph, StreamingTextRenderer, before/after table when after !== null.
  2. Edit App.tsx to wire onDrill sets drillContext and calls turnController.drill(questionId) then screen drill.
- **Verification command:**
  ```sh
  npx vitest run tests/mockrill/ui/screens.test.tsx -t "Drill shows original quote and before/after"
  ```
- **Expected output (tail):**
  ```
   ✓ tests/mockrill/ui/screens.test.tsx (1 test)
  ```
- **Done-when:** Drill renders original quote with label, target, streaming transcript, before/after table; App wires Re-drill → drill.

### WU-UI-08 — History screen

- **Goal:** List of completed sessions held in memory, no localStorage dependence.
- **Depends on:** WU-UI-03.
- **Files touched:** `src/mockrill/ui/screens/History.tsx` (CREATE), `src/mockrill/ui/App.tsx` (EDIT sessions)
- **Implementation steps:**
  1. Implement History.tsx per A9: props {sessions: Scorecard[]}, empty `No sessions yet` else ul with formatTimestamp.
  2. If localStorage touched at all, wrap in try/catch.
  3. In App.tsx ensure sessions is useState in-memory updated on scorecard-ready.
- **Verification command:**
  ```sh
  npx vitest run tests/mockrill/ui/screens.test.tsx -t "History renders in-memory sessions"
  ```
- **Expected output (tail):**
  ```
   ✓ tests/mockrill/ui/screens.test.tsx (1 test)
  ```
- **Done-when:** History renders No sessions yet when empty, lists sessions when present, no localStorage-dependent render.

### WU-UI-09 — degraded banner across all screens + build + jsdom screen test

- **Goal:** Every screen handles degraded envelope with amber banner, no modal; plus jsdom render with real makeEnvelope + npm run build.
- **Depends on:** WU-UI-01 through WU-UI-08, chassis isDegradedEnvelope/degradedResultOf.
- **Files touched:** `src/mockrill/ui/components/DegradedBanner.tsx` (CREATE), `src/mockrill/ui/App.tsx` (EDIT banner), all screens (EDIT banner prop), `tests/mockrill/ui/screens.test.tsx` (CREATE/EDIT jsdom test)
- **Implementation steps:**
  1. Create DegradedBanner.tsx per A10: role alert, amber background, text `Running on cached session data` plus `: ${reason}`.
  2. In App.tsx compute degraded via useMockrillEvents().degraded or isDegradedEnvelope and reason via degradedResultOf; render DegradedBanner persistently.
  3. Create screens.test.tsx jsdom verification required by R-UI-12: fed literal EventEnvelope[] built with real makeEnvelope from src/mockrill/contracts and assert visible texts `Overall: 3.5`, `07:42`, `Re-drill this answer`.
  4. Ensure npm run build exists (vite build).
- **Verification commands (both must pass):**
  ```sh
  npx vitest run tests/mockrill/ui/screens.test.tsx
  ```
  Expected tail:
  ```
   ✓ tests/mockrill/ui/screens.test.tsx (5 tests)
  Test Files  1 passed (1)
       Tests  5 passed (5)
  ```
  Second:
  ```sh
  npm run build
  ```
  Expected success line: contains `built in` or `building for production` and exit 0; no network required.
- **Done-when:** DegradedBanner amber persistent exists, every screen handles degraded, no blocking modal, jsdom test with real makeEnvelope asserts on 07:42 + Re-drill passes, and npm run build succeeds offline.


## §10 Acceptance criteria

| # | Requirement | Satisfied by | Check |
|---|---|---|---|
| R-UI-01 | eventBus M37 sync ordered, snapshot, reset, singleton | WU-UI-01 | vitest eventBus.test.ts passes, mockrillBus singleton, throw not break |
| R-UI-02 | useMockrillEvents two sources, UseEventStreamResult imported | WU-UI-02 | imports `UseEventStreamResult` not re-declared, live sorted/degraded/reconnect, stream delegates |
| R-UI-03 | Source resolution order ?source=stream → MOCKRILL_SOURCE → live | WU-UI-02 | resolveMockrillSource implements literally, tested with URL param and env |
| R-UI-04 | main.tsx mounts App, index.html re-point and title, why /examples/ git-ignored | WU-UI-03 | node -e checks script src and title, comment in main.tsx |
| R-UI-05 | Setup: three roles, mic test, TTS check, theme setTheme, Start button, banner | WU-UI-04 | screens.test Setup asserts three roles, banner exact text, setTheme called, button label |
| R-UI-06 | LiveCall: StreamingTextRenderer, StepStatusIndicator, timer, latency_ms | WU-UI-05 | imports chassis components and formatTimestamp, <small>Latency | WU-UI-05 |
| R-UI-07 | ScorecardView: four axis bars, overall, CitationDisplay+adapter, label mm:ss, Re-drill | WU-UI-06 | adapter file exists, renders four progress, Overall, 07:42 label, Re-drill button on weakest |
| R-UI-08 | Drill: original quote, target, live transcript, before/after table | WU-UI-07 | Drill renders blockquote label, target, StreamingTextRenderer, axis table |
| R-UI-09 | History: in-memory only, no localStorage dependence, try/catch | WU-UI-08 | History renders No sessions yet, in-memory list, try/catch if localStorage used |
| R-UI-10 | Degraded: isDegradedEnvelope/degradedResultOf, amber banner Running on cached session data + reason, no modal | WU-UI-09 | DegradedBanner role alert amber, every screen checks degraded, reason displayed, no modal |
| R-UI-11 | Non-negotiables: no llmGateway/ASSEMBLYAI_API_KEY import, imports from scoring/contracts, setTheme, no new dependency | WU-UI-01–09 | grep ui for ASSEMBLYAI_API_KEY 0 hits, imports verified, build offline |
| R-UI-12 | Verification: jsdom + makeEnvelope assert visible text + npm run build | WU-UI-09 | screens.test jsdom with real makeEnvelope asserts Overall: 3.5 /07:42/Re-drill, build contains built in |

## §11 Non-goals

- LLM prompting, tool definitions, `chatCompletion`, question-bank content, filler lexicon, deterministic rubric thresholds — owned by DP-INTERVIEWER / DP-SCORECARD; UI only displays outputs.
- Token minting (`GET /api/aai-token`), WebSocket streaming, PCM capture, AudioWorklet, VAD thresholds — owned by DP-AAI-STREAM; UI only consumes `createTurnController`.
- Turn-taking state machine, `speechSynthesis` wrapper impl — owned by DP-TURNTAKING; UI only calls `turnController.start/drill`.
- Health endpoint, `vercel.json` rewrites, deployment verification — owned by DP-DEPLOY.
- Golden fixture / mock publisher / fallback-ladder doc — owned by DP-DEMOPROOF (UI consumes rung 4 via `source=stream`).
- New CSS framework, new UI dependency, bespoke theming — forbidden; `setTheme` from `src/platform/ui` only.
- Second API key, `localStorage`-dependent core behavior, `withResilience` wrapping in UI — forbidden.

## §12 Open questions

| # | Question | Safe default chosen by this plan (in own namespace) |
|---|---|---|
| Q-UI-01 | Exact `Citation` shape in `src/platform/ui/CitationDisplay.tsx` not known at plan time | Adapter `toCitation` casts `EvidenceQuote` to `Citation` via `unknown`; if chassis `Citation` has different fields, adapter maps `text`→`quote/text`, `label`→`timestamp/label`, `note`→`source/note`; `label mm:ss` always rendered prominently outside `CitationDisplay` as fallback. |
| Q-UI-02 | Exact `StreamingTextRenderer` / `StepStatusIndicator` props not known at plan time | Plan specifies reading real files `src/platform/ui/*.tsx` before wiring; default props assumed `text`+`isStreaming` and `status` string; if envelope-aware variant, pass envelope. Both branches documented in A5. |
| Q-UI-03 | Whether chassis `UseEventStreamResult` status literals include `"open"` vs `"connected"` | For `source:"live"` this plan fixes `status:"open"` literally; for `source:"stream"` delegates unchanged so chassis literal is returned verbatim regardless. |
| Q-UI-04 | `engine/rag/question-bank.json` role keys not listed in handout | Setup imports `Object.keys(qb.roles)` and renders whatever three roles exist; plan does not hardcode role names beyond `frontend/backend/product` example, but requires exactly three options rendered. |
| Q-UI-05 | Need for `src/mockrill/ui/index.ts` barrel | No barrel required; each file imported directly; if added it must not create second bus instance and must re-export only owned surface. |
| Q-UI-06 | `index.html` original script `/examples/ui/dev-main.tsx` may not exist on disk (examples git-ignored) | Edit is still required: replace whatever `src` is there (or add if missing) to `/src/mockrill/ui/main.tsx` and set title exactly; missing original is not an error. |


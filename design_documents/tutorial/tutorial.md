# Mockrill Tutorial — End-to-End Walkthrough (Real-Life Story Replay)

> **App:** Mockrill — Realtime AI Mock-Interview Voice Coach (`src/mockrill/ui/App.tsx:66`)  
> **Real-life story source:** `design_documents/real-life-usecase.md` (Alex Chen, Junior Full-Stack Engineer, night-before screening call)  
> **Master blueprint:** `private/design_documents/master_blueprint_entry.md` (authoritative architecture + contracts — read §2/§3 before debugging any cross-module seam)  
> **This tutorial replays Alex's journey locally and on Vercel, click-by-click.**

---

## 0. What you will do

By the end you will have:

1. Compiled the app from source.
2. Run it locally on `http://localhost:5173` (dev) or `http://localhost:4173` (preview).
3. Optionally deployed it to `https://<app>.vercel.app` (Vercel HTTPS is required for microphone).
4. Replayed **Alex Chen's full loop** — Setup → Live Call (voice + ticking transcript + barge-in) → Evidence-backed Scorecard (timestamp quotes) → In-Session Voice Re-Drill → History — either with your own voice or with the zero-cost simulator.

Total time: ~8 minutes of focused rehearsal (see `design_documents/real-life-usecase.md:124`).

---

## 1. Prerequisites

| Requirement | Version / Note | Where to check |
|---|---|---|
| Node.js | `>=20` (`package.json:9`, `.nvmrc:1`) | `node -v` |
| npm | comes with Node 20+ | `npm -v` |
| Git Bash **or** PowerShell 5.1 | both work — commands differ where noted | `powershell -version` / `git --version` |
| Modern browser | Chrome 120+ or Edge 120+ (VAD + `getUserMedia` + `speechSynthesis`) | — |
| AssemblyAI key (live voice only) | `ASSEMBLYAI_API_KEY` — claim via the event signup link `https://www.assemblyai.com/dashboard/signup?utm_source=event&utm_medium=credit-grant&utm_campaign=lablab_virtual_hackathon` (accept cookies; if you already have an account, log out first then log back in through the link) | AssemblyAI dashboard |
| Vercel account (deploy only) | `VERCEL_TOKEN` + `VERCEL_PROJECT_ID` in `.env` | `vercel.com` dashboard |

> **No key? No microphone? No problem.** Append `?sim=1` to any URL (local or deployed) and the mic + AssemblyAI WebSocket are replaced by a replay of `fixtures/mockrill/session-golden.json` while every other code path (turn-taking, `/api/turn` scoring, scorecard, re-drill) stays real (`README.md:18`, `src/mockrill/ui/App.tsx:61`, `src/mockrill/ui/session.ts:97`).

---

## 2. Install & compile

All commands run from the **repo root** `2026-09-assemblyAI/` unless noted.

### PowerShell (Windows)

```powershell
# 1. Clone / enter repo (if not already there)
Set-Location -LiteralPath "C:\Users\cesar\Documents\CursorAI-projects\hackathon-entries\2026-09-assemblyAI"

# 2. Install exact deps (uses package-lock.json)
npm ci

# 3. Type-check (should be silent on success)
npm run typecheck

# 4. (Optional) run unit + E2E locally
npm run test:mockrill   # 42 unit tests
npm run test:e2e        # 29 Playwright tests — needs `npx playwright install chromium` once
```

### Git Bash

```bash
# 1. Enter repo
cd /c/Users/cesar/Documents/CursorAI-projects/hackathon-entries/2026-09-assemblyAI

# 2. Install
npm ci

# 3. Type-check
npm run typecheck
```

Expected output of `npm run typecheck`: no output (exit 0).  
Expected output of `npm ci`: `added <n> packages`.

> **If `npm ci` fails with `EPERM` on Windows** — `unlink '...rolldown-binding.win32-x64-msvc.node'` — the Vite/Rolldown native binary is still locked (dev server, editor, or antivirus is holding it). This is not a code bug. Fix without deleting the repo:
>
> **Git Bash (you are here — MINGW64):**
> ```bash
> # 1. Stop anything holding the file — dev server, preview, mock:publish
> #    Ctrl+C in those terminals, or kill all node processes:
> taskkill //F //IM node.exe 2>/dev/null; echo "killed"
>
> # 2. Close VS Code / Cursor file watchers on node_modules if open, then retry:
> npm ci
>
> # 3. If it still locks (antivirus / stale handle), remove the locked subtree and reinstall:
> rm -rf node_modules/.vite node_modules/@rolldown 2>/dev/null
> npm cache verify
> npm ci
>
> # 4. Nuclear fallback — full clean reinstall (keeps lockfile, slow):
> rm -rf node_modules package-lock.json  # only if 3 keeps failing
> npm install
>
> # 5. Last resort — run the shell elevated (Start Menu → Git Bash → Run as Administrator) then npm ci
> ```
>
> **PowerShell equivalent:**
> ```powershell
> # 1. Stop lock holders
> Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
>
> # 2. Retry
> npm ci
>
> # 3. If still locked
> Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
> Remove-Item -Recurse -Force node_modules\@rolldown -ErrorAction SilentlyContinue
> npm cache verify
> npm ci
>
> # 4. Nuclear
> Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
> npm install
> ```
>
> Why `npm ci` and not `npm install` normally: `ci` is the reproducible path enforced by `package-lock.json` (`package.json:1` comment `RES-REU-01`). Use `npm install` only when the lockfile or native binding is wedged. Never run `npm ci` while `npm run dev` / `npm run preview` / `npm run mock:publish` is still running in another terminal — Vite holds `rolldown-binding.win32-x64-msvc.node` open.

### Configure environment

```powershell
# PowerShell — copy template and edit with your key
Copy-Item -Path ".env.example" -Destination ".env"
# then open .env in your editor and set:
# ASSEMBLYAI_API_KEY=your_key_here
# MOCKRILL_LLM_MODEL=claude-sonnet-4-6
# (optional for deploy) VERCEL_TOKEN=...  VERCEL_PROJECT_ID=...
```

```bash
# Git Bash
cp .env.example .env
# edit .env: set ASSEMBLYAI_API_KEY
```

> `.env` is git-ignored. `vercel.json:3` and `.env.example:1` confirm no secret is committed.

---

## 3. Run the local server

The Vite dev server serves **both** the UI and the three serverless routes (`/api/aai-token`, `/api/turn`, `/health`) via the dev-API plugin (`scripts/vite-dev-api.ts:109`, `vite.config.ts:28`). You do not need a separate `vercel dev`.

### Option A — Dev server (hot reload, default)

**PowerShell:**

```powershell
npm run dev
# → VITE v8.x  ready in ~400 ms
# → ➜  Local:   http://localhost:5173/
```

**Git Bash:**

```bash
npm run dev
# open http://localhost:5173/ in your browser
```

Keep this terminal open. Open `http://localhost:5173` — you should see **"Ready when you are"** (`src/mockrill/ui/screens/Setup.tsx:58`).

### Option B — Production preview (exact deployed bundle)

```powershell
npm run build        # → dist/
npm run preview      # → http://localhost:4173/
```

```bash
npm run build && npm run preview
# open http://localhost:4173/
```

Both `server` and `preview` proxy `/events` to the mock publisher — needed for §3.4 below.

### Simulated mode (no key, no mic, zero cost)

Append `?sim=1` — works on either port and on the deployed URL:

```
http://localhost:5173/?sim=1
http://localhost:4173/?sim=1
https://<app>.vercel.app/?sim=1
```

What changes: `resolveMode()` returns `"sim"` (`src/mockrill/ui/App.tsx:61`), `startSession` uses `createSimMicSource` + `createSimStreamingClient` (`src/mockrill/ui/session.ts:97`), envelopes tick identically. No permission prompt, no billing.

### Offline SSE replay (Rung 4 — zero network)

Needs two terminals (also useful for airplane / venue Wi-Fi):

**PowerShell:**

```powershell
# Terminal 1
npm run dev
# Terminal 2
npm run mock:publish
# Browser
# http://localhost:5173/?source=stream
```

**Git Bash:**

```bash
npm run dev &          # or two tabs
npm run mock:publish
# open http://localhost:4173/?source=stream   (if using preview)
```

`npm run mock:publish` replays `fixtures/mockrill/session-golden.json` on `http://localhost:8787` via SSE (`vite.config.ts:12`, `scripts/mockrill-mock-publish.ts`). The UI at `?source=stream` renders the same ticking transcript. Probe: `curl http://localhost:8787/events` and `curl http://localhost:8787/events/stream`.

---

## 4. Deploy to the cloud (Vercel, HTTPS required for microphone)

`getUserMedia` is blocked on `http://` — a deployed `https://` URL is mandatory for live voice (`docs/deploy-checklist.md:8`).

### 4.1 Set Vercel credentials

Add to `.env` (never commit):

```
VERCEL_TOKEN=vercel_xxx
VERCEL_PROJECT_ID=prj_xxx
PUBLIC_URL=https://<your-app>.vercel.app   # filled after first deploy
```

You can also export them in the shell for one-off deploy:

**PowerShell:**

```powershell
$env:VERCEL_TOKEN="vercel_xxx"
$env:VERCEL_PROJECT_ID="prj_xxx"
```

**Git Bash:**

```bash
export VERCEL_TOKEN=vercel_xxx
export VERCEL_PROJECT_ID=prj_xxx
```

### 4.2 Deploy

```powershell
npm run deploy
# [deploy] OK vercel https://<app>.vercel.app in <ms>ms
# [deploy] next: npm run deploy:verify
```

```bash
npm run deploy
```

What ships: Vite build `dist/` + exactly three serverless functions `api/aai-token.ts`, `api/turn.ts`, `api/health.ts` (`vercel.json:39`, `docs/deploy-checklist.md:92`). Audio never proxies through a function — browser connects directly to `wss://streaming.assemblyai.com/v3/ws` (`docs/deploy-checklist.md:92`).

### 4.3 Smoke verify

```powershell
# PowerShell — point PUBLIC_URL at the deployed URL first
$env:PUBLIC_URL="https://<app>.vercel.app"
npm run deploy:verify
# PASS <ms>ms (attempt 1, status 200)

# Or one-liner
$env:PUBLIC_URL="https://<app>.vercel.app"; npm run deploy:verify
```

```bash
PUBLIC_URL=https://<app>.vercel.app npm run deploy:verify
# PASS <ms>ms (attempt 1, status 200)
```

`scripts/smoke-deploy.ts:14` polls `GET $PUBLIC_URL/health` every 2 s up to 30 s. On failure see fallback chain `docs/fallback-ladder.md`.

### 4.4 Switch deploy provider (optional, no code change)

```powershell
$env:DEPLOY_PROVIDER="replit"   # or "docker"
npm run deploy
npm run deploy:verify
```

```bash
DEPLOY_PROVIDER=replit npm run deploy
```

Adapters live in `src/platform/deploy/adapters/` (`docs/deploy-checklist.md:70`).

---

## 5. Browser walkthrough — replaying Alex Chen's story

Open **one** of these URLs (use the one you have):

| Context | Link to open |
|---|---|
| Local dev (live voice) | `http://localhost:5173/` |
| Local dev (simulator, no key) | `http://localhost:5173/?sim=1` |
| Preview (simulator) | `http://localhost:4173/?sim=1` |
| Offline SSE replay | `http://localhost:5173/?source=stream` (with `npm run mock:publish` running) |
| Cloud (live) | `https://<app>.vercel.app` |
| Cloud (simulator) | `https://<app>.vercel.app/?sim=1` |

The app has **five logical screens** driven by `screen` state in `src/mockrill/ui/App.tsx:27` — `setup | live | scorecard | drill | history`. A header breadcrumb shows context, a degraded banner shows `aai_key_missing` etc. when on golden cache, and `window.__mockrill` exposes envelopes for inspection (`src/mockrill/ui/App.tsx:140`).

---

### Step 1 — Setup (the "Pre-call setup" — `src/mockrill/ui/screens/Setup.tsx`)

You land on **"Ready when you are"** (`Setup.tsx:58`).

1. **Read the hero copy** — *"A ten-minute voice screen ... Nothing is recorded to a server"* — this is Alex's on-ramp at 9:30 PM (`real-life-usecase.md:31`).

2. **Pre-flight checks (right column):**
   - **Microphone** — `Mic` icon (`Setup.tsx:142`). Click **Test microphone**. Grant the browser prompt (Allow). Shows `Microphone ready` (`Setup.tsx:147`). If it shows `Microphone unavailable`, stay on `?sim=1` — the rest still works.
   - **Voice output** — `Volume2` — shows `Browser speech ready` if `speechSynthesis` exists, else `Text only` (`Setup.tsx:152`).
   - **Transcription** — `AudioLines` — always `AssemblyAI streaming` (`Setup.tsx:160`).

3. **Preferences (bottom-right):** dropdown **Interface skin** — `minimal | editorial | operator` (`Setup.tsx:198`). This only changes density/type; light/dark is the header toggle.

4. **Choose the screen you're rehearsing (left card — `Setup.tsx:71`):**
   - Click the **Role** select (`id="role-select"`).
   - Pick the role that matches Alex's story:
     - **`junior-frontend`** — *React, debugging and accessibility* (6 questions `fe-01..fe-06` in `engine/rag/question-bank.json:5`).
     - `junior-backend` — APIs, data & failure handling.
     - `career-switcher` — STAR behavioural for non-industry backgrounds.
   - For the canonical Alex replay use **`junior-frontend`** — the first preview question is:
     > *"Tell me about a time you debugged a tricky UI bug. What was the symptom, how did you isolate it, and what did you ship?"* (`fe-01`).

   Selecting a role previews **2 questions** (`Setup.tsx:35`) with competency pill + difficulty.

5. **Start:** click **Start screening call** (`Setup.tsx:119`, text `PhoneCall` icon). Disabled until a role is chosen. This calls `handleStart(role)` (`App.tsx:152`) → `startSession({ role, bus, mode })` (`session.ts:80`). The browser then:
   - `GET /api/aai-token` mints a short-lived token (master key never hits the client — `real-life-usecase.md:51`, `session.ts:59`).
   - Requests `getUserMedia` at 16 kHz mono if live (`session.ts:97`).
   - Opens `wss://streaming.assemblyai.com/v3/ws?token=...` at 200 ms PCM chunks.
   - Total setup: ~3 s (`real-life-usecase.md:52`).

   In `?sim=1` or `?source=stream` there is no mic/token — envelopes replay immediately and the app jumps to **Live**.

> **E2E selectors:** `data-testid="setup-start"` and `"connect-button"` drive `handleStart("junior-frontend")` (`App.tsx:229`) — handy for Playwright/DEMDRIVE.

---

### Step 2 — Live Call (the screening call — `src/mockrill/ui/screens/LiveCall.tsx`)

You are now on `data-testid="screen-live"` (`App.tsx:252`). This is Step 2 in `real-life-usecase.md:73`.

#### What you see

- **Top card (Interviewer is asking)** — animated via `motion.section` (`LiveCall.tsx:104`), shows the current `InterviewQuestion.text` (`LiveCall.tsx:119`) with competency/difficulty pills and a tiny `latency_ms` badge (`LiveCall.tsx:115` — the sub-second proof).
- **Working indicator** while waiting for the first question — 3 steps: *Checking your microphone → Opening the AssemblyAI stream → Interviewer joining* (`LiveCall.tsx:11`) ticked via `stepsUpTo(…, connectStep(envelopes))` (`LiveCall.tsx:133`).
- **You, live** — `StreamingTextRenderer` for `transcript-partial` deltas (`LiveCall.tsx:147`), empty text *"Your words appear here as you speak…"*. Partials are cumulative — only the newest is rendered (`LiveCall.tsx:96`).
- **Rail of finalized turns** (`LiveCall.tsx:154`) — after VAD fires `end_of_turn` + `turn_is_formatted`, each becomes a `transcript-final` with `TimecodeChip` at `words[0].start` (`LiveCall.tsx:166`, `formatTimestamp` from `src/mockrill/contracts`).
- **Right aside:**
  - `VoiceOrb` reflecting `sessionState` (`LiveCall.tsx:176`) — `connecting → listening → thinking → speaking → scoring → complete` (`App.tsx:33`).
  - **Elapsed** timer from `session-start` (`LiveCall.tsx:184`) + **Turn latency** (`LiveCall.tsx:189`) + `Sparkline` of last 12 latencies (`LiveCall.tsx:191`).
  - Hidden `data-testid="session-state"` (`LiveCall.tsx:178`) for tests.
  - `StepStatusIndicator` fed `{ envelopes, status: sessionState }` (`LiveCall.tsx:201`).

#### What to do (Alex's script)

1. **Listen** to the interviewer — either via `speechSynthesis` (browser voice) or as text. The question text matches the role bank (`engine/rag/question-bank.json`). Example:
   > *"Hi Alex, thanks for taking the time today. Let's dive right in. Can you walk me through a situation where you had to resolve a severe database performance bottleneck under time constraints?"* (`real-life-usecase.md:75`)

2. **Speak** your STAR answer into the mic. Watch the **live ticking transcript** appear word-by-word (PCM → AssemblyAI `universal-3-5-pro` → `Turn` events). Try Alex's weak first attempt:
   > *"Well, um, in our capstone project we had a MongoDB query that was... kind of lagging during user authentication..."* (`real-life-usecase.md:78`)

   In sim/stream mode just watch — the golden transcript ticks identically.

3. **Handle the follow-up** — as soon as you pause, VAD fires `end_of_turn`, the client `POST /api/turn` to the LLM Gateway (`claude-sonnet-4-6` → fallback `qwen3.5-4b-32k-fast`) with `select_question` tool (`real-life-usecase.md:80`), and the interviewer instantly asks:
   > *"Interesting. How specifically did you identify whether the bottleneck was caused by an unindexed query or database connection pool exhaustion?"*

4. **Try barge-in:** speak *over* the interviewer mid-sentence — e.g. *"We checked the pool size—wait, actually, let me start with the query profiling first."* The `TurnController` cancels TTS audio client-side (`real-life-usecase.md:82`, `session.ts:106` speaker). You keep control without overlap.

5. After ~4 turns the state becomes `scoring`. Click **View Scorecard** (`App.tsx:262`, `ClipboardCheck`) when it appears, or wait — `scorecard-ready` auto-navigates live → scorecard (`App.tsx:127`).

> If you see a **start-error** alert (*"Could not start the call: … Allow microphone access, or continue in simulation mode."* — `App.tsx:255`), you are on live mode without mic permission — either Allow or reload with `?sim=1`.

---

### Step 3 — Scorecard (evidence-backed — `src/mockrill/ui/screens/ScorecardView.tsx`)

You are on `data-testid="screen-scorecard"` (`App.tsx:284`). This is Step 3 in `real-life-usecase.md:85`.

#### What you see

- **Summary panel** (`App.tsx:290`):
  - `ScoreRing` + `CountUp` for **Overall** (`data-testid="scorecard-overall"`), **Filler words** (`data-testid="scorecard-fillers"`), **Duration** (`formatTimestamp(duration_ms)`), **Answers count** (`App.tsx:296`).
  - **Most repeated** chips — `"word" @ mm:ss` for the top fillers (`App.tsx:320`).

- **Per-answer cards** (`ScorecardView.tsx:24`) — one per `per_question`:
  - Title `Answer N` + `question_id` + `Focus here` amber chip if weakest (`ScorecardView.tsx:35` — amber, never red per §8.4).
  - Four `mk-meter` axes `structure | specificity | clarity | relevance` (`ScorecardView.tsx:42`) + `rationale` prose + `RubricRadar` (`ScorecardView.tsx:53`).
  - **What you actually said** — each `EvidenceQuote` via `CitationDisplay` from `toCitation(q)` as `evidence-quote` envelope (`ScorecardView.tsx:61`) + `TimecodeChip` `label` at `start_ms` (`ScorecardView.tsx:72`) + `kind` chip (`filler` → rose, `quote` → neutral — `ScorecardView.tsx:74`).
  - Example evidence the story expects (`real-life-usecase.md:99`):
    - `[01:42] "kind of lagging" — 3× crutch phrase`
    - `[03:15] "um, you know, basically" — 4.2s hesitation`
  - In the golden fixture the deterministic filler hit is at `07:42` — rendered via `CitationDisplay` quoting `kind of` 3× (`fixtures/mockrill/session-golden.json` turn 2 at `462000` ms, `ScorecardView.tsx:61`).

- **Weakest card only:** button **Re-drill this answer** (`ScorecardView.tsx:83`, `RotateCcw`) + footnote *"Same session, same socket — the interviewer just re-asks."*

#### What to do

1. **Read** your overall score (Alex got `3.8 / 5.0` with `11` fillers — `real-life-usecase.md:97`).
2. **Find the `Focus here` card** — weakest `question_id` via `selectWeakest(scorecard)` (`ScorecardView.tsx:19`) / `weakest_question_id`.
3. **Click Re-drill this answer**. This calls `handleDrill(weakestId)` (`App.tsx:170`) which computes weakest `RubricAxis`, builds `drillContext` with the real `InterviewQuestion` from `askedQuestions`, and fires `controller.drill(questionId)` without reconnecting (`session.ts:120`).

> E2E selector: `data-testid="drill-button"` (`App.tsx:235`).

---

### Step 4 — Re-Drill (same session — `src/mockrill/ui/screens/Drill.tsx`)

You are on `data-testid="screen-drill"` (`App.tsx:369`). This is Step 4 in `real-life-usecase.md:117`.

- **Left:**
  - *The moment we're re-running* — the original `EvidenceQuote.text` + `TimecodeChip` + `Target: Focus on <weakest axis>` (`Drill.tsx:64`).
  - **Before and after** table (`Drill.tsx:77`) once re-scored — Δ chip is `▲ d` green if positive, neutral otherwise (`Drill.tsx:22`).

- **Right:**
  - **Your second attempt** — `StreamingTextRenderer` from synthetic `transcript-partial` envelopes built from `attemptTranscript` (`Drill.tsx:115`) + caret while streaming.
  - `WorkingIndicator` with *Re-opening the same session → Interviewer re-framing → Re-scoring* (`Drill.tsx:127`) until the second `answer-scored` for that `question_id` arrives.
  - `RubricRadar` with dashed outline of `before` vs solid `after` (`Drill.tsx:141`).

#### What to do (Alex's redemption)

Deliver the fix the interviewer coached:

> *"In our capstone project, user authentication latency spiked to 1,200 ms. I ran `explain('executionStats')` in MongoDB and discovered a missing index on the `email` field resulting in a full collection scan. After creating a compound index, query execution dropped from 1,200 ms to 14 ms, restoring full auth throughput."* (`real-life-usecase.md:121`)

Watch the live transcript tick green, then see **5.0 / 5.0 with 0 fillers** (`real-life-usecase.md:122`). Click **Back to Scorecard** (`App.tsx:385`) to re-inspect, or **Back to Setup** to start a fresh call (socket closed via `beforeunload` — `session.ts:131`).

---

### Step 5 — History + other tabs

From **Scorecard** click **History** → `data-testid="screen-history"` (`App.tsx:423`). The `History` screen (`src/mockrill/ui/screens/History.tsx`) lists every `Scorecard` in `sessions` this browser session. From **Setup** you can also reach History before any call. Use **Back to Setup** (`App.tsx:417`) to return.

The **Live** screen also has a **Back to Setup** ghost button (`App.tsx:269`) that stops the session (`controller.stop()` + `client.terminate()` + `mic.stop()` — `session.ts:138`).

---

## 6. Verifying you are on the right mode

| URL suffix | Mode | Mic | Token | Data | Banner |
|---|---|---|---|---|---|
| (none) | `live` — `resolveMode() === "live"` (`App.tsx:63`) | requested | `GET /api/aai-token` (`session.ts:62`) | your voice | none unless token fails |
| `?sim=1` | `sim` | `createSimMicSource` | none | `fixtures/mockrill/session-golden.json` | none (sim is explicit) |
| `?source=stream` | `stream` — `resolveMockrillSource()` (`useMockrillEvents.ts:9`) | none | none | SSE from `:8787/events/stream` (`vite.config.ts:14`) | none |
| Token failure / `RES_FORCED_DEGRADED=1` | `sim` fallback | none | degraded | golden cache (6 keys) | amber `DegradedBanner` with `reason` (`App.tsx:220`) |

Inspect live state: open browser console → `window.__mockrill` (`App.tsx:141`) exposes `{ envelopes, screen, sessionState, scorecard, degraded, mode, source }`.

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Blank after Start | mic denied | `Allow` in browser site permissions, or reload with `?sim=1`. Error shows in `data-testid="start-error"` (`App.tsx:256`). |
| No transcript ticks (live) | no `ASSEMBLYAI_API_KEY` or token 503 | `DegradedBanner` explains `reason`; app falls back to golden session automatically (`session.ts:88`). Check `.env` key, or force `RES_FORCED_DEGRADED=1 npm run dev` to rehearse the degraded path (`docs/fallback-ladder.md:31`). |
| `/health` 404 locally | expected — rewrite is Vercel-only | use `/api/health` locally; `docs/deploy-checklist.md:4`. `npm run deploy:verify` checks `PUBLIC_URL/health` only after deploy. |
| `The demo overlays` overlap | `SpeechSynthesis` not ready | text fallback appears; transcript still ticks. Check Pre-flight Voice output (`Setup.tsx:152`). |
| SSE stream 404 | mock publisher not running or wrong port | start `npm run mock:publish` (port 8787) and ensure `?source=stream` URL. Override: `npm run mock:publish -- --port 8788` then open `http://localhost:5173/?source=stream&port=8788` (if supported) or reproxy `vite.config.ts:13`. |
| `npm ci` → `EPERM` unlink `rolldown-binding.win32-x64-msvc.node` | Vite/Rolldown `.node` binary still held open by `npm run dev` / preview / mock:publish / antivirus | Stop holders first: `taskkill //F //IM node.exe` (Git Bash) or `Get-Process node \| Stop-Process -Force` (PowerShell), close VS Code watchers, then `rm -rf node_modules/.vite node_modules/@rolldown; npm cache verify; npm ci`. Full fallback: `rm -rf node_modules; npm install`. See §2 box above. |
| Deploy fails (Vercel) | missing `VERCEL_TOKEN` / `VERCEL_PROJECT_ID` | set in `.env` and re-run `npm run deploy`. See `scripts/deploy.ts:9` → `src/platform/deploy/deploy.ts:runDeploy`. Rollback: `npx vercel rollback --token=$VERCEL_TOKEN` (`docs/deploy-checklist.md:55`). |

---

## 8. Replaying the full story in 60 seconds (presenter script)

For a 60 s demo without speaking yourself:

```bash
# PowerShell — zero-network, zero-key, deterministic:
npm run build; if ($?) { npm run preview }   # http://localhost:4173
# new terminal:
npm run mock:publish                          # http://localhost:8787
# browser: http://localhost:4173/?source=stream
# — narrate the transcript as it ticks, then the 07:42 evidence quote, then Re-drill.
```

The same golden capture is also parked under DEMODRIVE (`npm run demodrive:capture`) and as a `?sim=1` replay — these are Rungs 3 and 2 of the 4-rung ladder (`docs/fallback-ladder.md:4`).

---

## 9. Related docs

- `design_documents/real-life-usecase.md` — the Alex Chen narrative this tutorial replays.
- `private/design_documents/master_blueprint_entry.md` — §1 requirements trace, §2 architecture + contract table, §3 plan map (read before any code-area edit).
- `README.md` — 90 s quickstart + architecture diagram (`docs/architecture.png`).
- `docs/fallback-ladder.md` — 4-rung degraded-demo ladder with per-rung presenter sentences.
- `docs/deploy-checklist.md` — HTTPS/mic verification 5-point checklist + rollback.
- `docs/engine-guide.md`, `engine/rag/question-bank.json` — role/question bank (18 questions, 3 roles).
- `design_documents/e2e-testing/` — coverage matrix + runbook for `npm run test:e2e`.


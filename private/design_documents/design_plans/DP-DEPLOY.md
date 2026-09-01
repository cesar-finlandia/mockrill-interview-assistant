# DP-DEPLOY — Vercel Deployment, Routes & Health Smoke

## §1 Purpose & scope

### §1.1 What this plan delivers

- **Root `vercel.json` (M41)** — the ONLY file Vercel reads at deploy time. Adds `framework: vite`, `buildCommand: npm run build`, `outputDirectory: dist`, `installCommand: npm ci`, SSE headers on `/events`, `Cache-Control: no-store` on `/api/aai-token`, the critical rewrite `{"source": "/health", "destination": "/api/health"}` (known trap — without it `deploy:verify` polls 404), and `functions` runtime pinned to `nodejs20.x`. State clearly `config/deploy/vercel.json` is chassis, read-only, must not be edited; root file is new and additive.
- **`api/health.ts` (M40)** — `GET /api/health` → `200 { ok: true, version, commit }` where `version` from `package.json` and `commit` from `process.env.VERCEL_GIT_COMMIT_SHA ?? "local"`. No auth, no key, no dependency — returns 200 even if every other module is broken, because it is the smoke target.
- **`package.json` scripts you own (and only these)** — `"build": "vite build"` (required because `config/deploy/vercel.json` sets `buildCommand: npm run build` while chassis only defines `build:ui` — **this missing script is a real, present defect in the working copy**, say so) and `"preview": "vite preview --port 4173"`.
- **Environment model (NFR-04)** — complete env table (var · where set · who reads · missing→), new root `.env.example` adding `ASSEMBLYAI_API_KEY`, `MOCKRILL_LLM_MODEL`, `MOCKRILL_LLM_FALLBACK_MODEL` (state `config/env.example` is chassis read-only, so additions go in new root file; `.env` already git-ignored), and `PUBLIC_URL`/`VERCEL_TOKEN`/`VERCEL_PROJECT_ID` handling.
- **Deploy runbook, rollback, and provider fallback** — numbered copy-pasteable runbook (7 steps), rollback via `npx vercel rollback`, fallback providers `replit`/`docker` already in `src/platform/deploy/adapters/` with one-line `DEPLOY_PROVIDER` switch, and the invariant that audio never proxies through a serverless function.
- **Verification contract for a low-intelligence implementor** — every work unit ends with ONE runnable command and exact expected output; build/health/rewrite/deploy:verify all independently verifiable.

### §1.2 Explicitly OUT of scope, and which DP owns it instead

| Out-of-scope item | Owning DP | Reason |
|---|---|---|
| `TranscriptWord`, `TranscriptTurn`, `InterviewQuestion`, `RubricAxis`, `EvidenceQuote`, `FillerHit`, `AnswerScore`, `Scorecard`, `SessionState`, `MOCKRILL_STEP_IDS`, `MockrillStepId`, `StepPayloads`, `makeEnvelope`, `formatTimestamp`, `engine/schema/*.json` (M1–M15) | DP-CONTRACTS | Vocabulary / pure helpers; deploy imports nothing from them |
| `GET /api/aai-token`, `createMicSource`, `createStreamingClient`, `StreamingClientOptions`, barrel `src/mockrill/voice/index.ts` (M16–M20) | DP-AAI-STREAM | Mic + streaming; deploy only documents that audio never proxies through serverless |
| `createSpeaker`, `createTurnController`, `TurnControllerDeps` (M21–M23) | DP-TURNTAKING | Turn-taking state machine; deploy does not re-declare |
| `TurnRequest`, `InterviewerAction`, tool descriptors, `chatCompletion`, `POST /api/turn`, `callInterviewer`, `engine/rag/question-bank.json` (M24–M29) | DP-INTERVIEWER | LLM orchestration / gateway; deploy only documents env defaults for models |
| `FILLER_LEXICON`, `detectFillers`, `buildEvidence`, `scoreAnswerDeterministic`, `mergeScores`, `buildScorecard`, `selectWeakest` (M30–M36) | DP-SCORECARD | Scoring logic |
| `createEventBus`, `useMockrillEvents`, `main.tsx`/`index.html` (M37–M39) | DP-UI | UI wiring; deploy ensures UI build passes via `npm run build` but does not own screens |
| `fixtures/mockrill/session-golden.json`, `scripts/mockrill-mock-publish.ts`, `docs/fallback-ladder.md` (M42–M44) | DP-DEMOPROOF | Offline replay fixture + mock publisher; deploy only references fallback ladder rungs |
| `docs/architecture.mmd`, `submission.md` (M45–M46) | DP-SUBMIT | Submission artifacts |
| Any `withResilience` wrapping, scoring, or filler detection | DP-INTERVIEWER / DP-AAI-STREAM / DP-SCORECARD | Deploy owns no `withResilience` call; health endpoint is intentionally unwrapped |

## §2 Requirements

| # | Requirement | Source | Judging axis |
|---|---|---|---|
| R-DEP-01 | `package.json` defines `"build": "vite build"` and `"preview": "vite preview --port 4173"`; `npm run build` succeeds and writes `dist/` with `index.html` — required because `config/deploy/vercel.json` sets `buildCommand: npm run build` while chassis only defines `build:ui`; **this missing script is a real, present defect in the working copy** — plan must say so verbatim | Prompt: M41 buildCommand / package.json script ownership table, NFR gate | Presentation (gate) |
| R-DEP-02 | `api/health.ts` handles `GET /api/health` → `200 { ok: true, version, commit }` where `version` is `import { version } from "../../package.json"` (or read via `createRequire`) and `commit` is `process.env.VERCEL_GIT_COMMIT_SHA ?? "local"`; no auth, no `ASSEMBLYAI_API_KEY` access, no dependency on any other module — MUST return 200 even if every other part of the app is broken (smoke target). Handles non-GET with `405` and `Allow: GET`. Also `GET /health` returns same payload via Vercel rewrite — smoke script polls `GET $PUBLIC_URL/health` while function lives under `/api/*` (known trap) | S7 M40, smoke script `scripts/smoke-deploy.ts` | Presentation (gate) |
| R-DEP-03 | Root `vercel.json` exists at repo root (not only `config/deploy/vercel.json`) and contains: `framework: vite`, `buildCommand: npm run build`, `outputDirectory: dist`, `installCommand: npm ci`, `framework`/`buildCommand`/`outputDirectory`/`installCommand` carried verbatim from chassis file, PLUS: `rewrites: [{ source: "/health", destination: "/api/health" }]` (known trap — called out explicitly), `headers` with SSE headers on `/events` (`Cache-Control: no-cache, no-transform` + `X-Accel-Buffering: no`) carried from chassis PLUS `Cache-Control: no-store` on `/api/aai-token`, `functions: { "api/**/*.ts": { runtime: "nodejs20.x" } }` (or `@vercel/node` runtime pinned to Node 20+). `config/deploy/vercel.json` is chassis read-only and must not be edited; root file is additive. No secret ever written into vercel.json. | S7 M41, chassis `config/deploy/vercel.json`, smoke trap | Presentation (gate) |
| R-DEP-04 | Root `.env.example` exists (new file) listing `ASSEMBLYAI_API_KEY`, `MOCKRILL_LLM_MODEL`, `MOCKRILL_LLM_FALLBACK_MODEL` with safe placeholder values (never a real key); `config/env.example` is chassis read-only so additions go in new root file; `.env` is already git-ignored. Complete env table written in plan covering all 7 rows (ASSEMBLYAI_API_KEY, MOCKRILL_LLM_MODEL, MOCKRILL_LLM_FALLBACK_MODEL, RES_FORCED_DEGRADED, PUBLIC_URL, VERCEL_TOKEN/VERCEL_PROJECT_ID, THEME/TRANSPORT/API_BASE/DEPLOY_PROVIDER) with var · set in · read by · missing→ | Prompt env table NFR-04 + chassis `config/env.example` | Presentation |
| R-DEP-05 | Deploy runbook written as numbered copy-pasteable 7 steps: 1 `npm ci`, 2 `npm run build` → `dist/`, 3 `npx vercel link` (once) + set 3 env vars in Vercel dashboard, 4 `npm run deploy` → `[deploy] OK vercel <url> in <ms>ms`, 5 put URL into `.env` as `PUBLIC_URL`, 6 `npm run deploy:verify` → `PASS <ms>ms (attempt N, status 200)`, 7 open URL confirm mic on HTTPS run 30-sec session confirm scorecard; PLUS rollback path (`npx vercel rollback`) and fallback providers (`src/platform/deploy/adapters/replit`, `docker`) with one-line `DEPLOY_PROVIDER` switch | Prompt runbook + chassis `src/platform/deploy/adapters/` | Presentation (gate) |
| R-DEP-06 | HTTPS microphone verification: `getUserMedia` only works on secure origin — plan requires opening deployed URL (https://...vercel.app) and confirming browser grants mic, with pass/fail checklist written in plan (camera/mic permission prompt, HTTPS lock, one 30-sec session, scorecard renders) | Prompt WU-DEP-06 + getUserMedia secure-origin requirement | Presentation |
| R-DEP-07 | Non-negotiables enforced by plan: audio never proxies through serverless (Vercel cannot hold long sockets; browser→AssemblyAI direct), exactly three functions ship (`api/aai-token.ts`, `api/turn.ts`, `api/health.ts` — adding fourth needs blueprint amendment), no secret in vercel.json/.env.example/fixture/log, deploy by end of week 2 not week 4, smoke-tested | Prompt Non-negotiables | Application of Technology |
| R-DEP-08 | All work units WU-DEP-01..07 each own a named file list, numbered steps, ONE runnable verification command with exact expected output, and Done-when. Cross-module verifications import provider's real export from provider's real path (not a stub). | S8 quality bar | Presentation |

## §3 Contracts OWNED by this plan

> Rule for every contract below: file path and exported name are exact. Consumers MUST import this from the owning path shown; re-defining, re-typing, stubbing or copying it is a defect.

### M40 `api/health.ts` — `GET /api/health` (also `GET /health` via rewrite)

- **File:** `api/health.ts`
- **Export:** `export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void>` (Vercel serverless function; default export). Alternative signature `export default function handler(req, res)` is also accepted but typed form below is normative.
- **TypeScript signature (normative):**
  ```ts
  // api/health.ts
  import type { VercelRequest, VercelResponse } from "@vercel/node";
  export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void>;
  ```
  If `@vercel/node` types are not installed, use `import type { IncomingMessage, ServerResponse }` compatible shape but plan fixes to `@vercel/node` as the import.
- **Input shape:** HTTP `GET /api/health` — no query params, no body, no auth header, no env secret read except `process.env.VERCEL_GIT_COMMIT_SHA`. If `req.method !== "GET"` → `405 Method Not Allowed` with header `Allow: GET` and JSON `{ error: "method_not_allowed" }`. No other method is handled.
- **Output shape (success):** `200` with `Content-Type: application/json` and JSON:
  ```json
  { "ok": true, "version": "0.0.0", "commit": "local" }
  ```
  where `version` is literally read from repo-root `package.json` `version` field (fallback `"0.0.0"` if read fails) and `commit` is `process.env.VERCEL_GIT_COMMIT_SHA ?? "local"`. On Vercel `VERCEL_GIT_COMMIT_SHA` is set by platform; locally it is undefined → `"local"`. No other fields are returned. No auth, no key, no dependency on `src/mockrill/*`, `src/resilience`, `src/platform`, or any other module — MUST return 200 even if every other part of the app is broken, because it is the smoke target.
- **Env read:** `process.env.VERCEL_GIT_COMMIT_SHA` only. MUST NOT read `ASSEMBLYAI_API_KEY`, `MOCKRILL_LLM_*`, or any secret. MUST NOT import `withResilience`.
- **Version reading algorithm (normative):** Use one of these equivalent forms (plan fixes to first):
  ```ts
  import { createRequire } from "module";
  const require = createRequire(import.meta.url);
  const { version } = require("../package.json") as { version: string };
  ```
  or `import pkg from "../package.json" assert { type: "json" }` if NodeNext JSON import is configured; or `readFileSync`. Any is acceptable but implementor must NOT hardcode a literal version string — it must be read from `package.json`.
- **Rewrite note:** Vercel serves this handler at `/api/health`. The chassis smoke script `scripts/smoke-deploy.ts` polls `GET $PUBLIC_URL/health` (no `/api` prefix). The root `vercel.json` rewrite `{"source":"/health","destination":"/api/health"}` makes these identical. Without it `deploy:verify` fails on a perfectly good deployment — plan must call this the known trap.
- **Consumers:** Chassis `scripts/smoke-deploy.ts` (`npm run deploy:verify` polls `$PUBLIC_URL/health`), humans curl-testing, Vercel health checks. No Mockrill code imports this module.
- **Import rule:** Consumers poll via HTTP `GET /health` or `GET /api/health`; they never import the handler. Re-implementing health via `src/mockrill/*` or stubbing it is a defect. Implementor MUST create exactly `api/health.ts` at repo root `api/` folder.

### M41 `vercel.json` at repo root — Vercel project settings + rewrites/headers/functions

- **File:** `vercel.json` at repo root (path literally `vercel.json` in repo root; NOT `config/deploy/vercel.json`).
- **Exports:** none — JSON config file consumed by Vercel platform; no TS export.
- **JSON shape (normative literal):**
  ```json
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "framework": "vite",
    "buildCommand": "npm run build",
    "outputDirectory": "dist",
    "installCommand": "npm ci",
    "rewrites": [
      { "source": "/health", "destination": "/api/health" }
    ],
    "headers": [
      {
        "source": "/events",
        "headers": [
          { "key": "Cache-Control", "value": "no-cache, no-transform" },
          { "key": "X-Accel-Buffering", "value": "no" }
        ]
      },
      {
        "source": "/api/aai-token",
        "headers": [
          { "key": "Cache-Control", "value": "no-store" }
        ]
      }
    ],
    "functions": {
      "api/**/*.ts": { "runtime": "nodejs20.x" }
    }
  }
  ```
  Alternative `runtime` values `nodejs20.x` or `nodejs22.x` are both Node 20+ and acceptable; plan fixes to `nodejs20.x`. If chassis uses `@vercel/node@3`, `runtime: "@vercel/node@3.0.0"` is equivalent — but `nodejs20.x` is the canonical string in this plan. If Vercel requires `"functions": { "api/*.ts": ... }` vs `"api/**/*.ts"` both are acceptable but `api/**/*.ts` covers nested.
- **Field-by-field justification:**
  - `framework: vite` — chassis ships `config/deploy/vercel.json` with `framework: vite`; root file carries same.
  - `buildCommand: npm run build` — required because chassis only defines `build:ui`; without `build: npm run build` Vercel build fails. **This missing script is a real, present defect in the working copy** — plan states this verbatim.
  - `outputDirectory: dist` — Vite default outDir; Vercel must serve static from `dist`.
  - `installCommand: npm ci` — deterministic install.
  - `rewrites[0]`: `/health` → `/api/health` — known trap; chassis `scripts/smoke-deploy.ts` polls `$PUBLIC_URL/health` but serverless functions live under `/api/*`; without rewrite smoke fails on good deployment. MUST be called out as known trap in plan and in JSON comment.
  - `headers[0]` on `/events`: `no-cache, no-transform` + `no` buffering — from chassis `config/deploy/vercel.json` SSE headers; these prevent proxy buffering of `createPublisher().asSseStream`.
  - `headers[1]` on `/api/aai-token`: `no-store` — prevents caching of short-lived AssemblyAI token (expires_in_seconds 60).
  - `functions` runtime `nodejs20.x` — pins Vercel functions to Node 20+ per chassis Node>=20 constraint; without pin, default may drift.
- **Chassis read-only note (must appear verbatim in plan and as `$comment` in JSON):** `config/deploy/vercel.json` is chassis and must not be edited; the root file is new and additive. Root `vercel.json` carries those settings plus the rewrite and no-store and runtime.
- **Secret ban:** No secret is ever written into `vercel.json` (not `ASSEMBLYAI_API_KEY`, not `VERCEL_TOKEN`). Grep `vercel.json` for `ASSEMBLYAI` must be zero.
- **Consumers:** Vercel platform (reads at build/deploy), `npm run deploy:verify` (polls `/health` which rewrites to `/api/health`).
- **Import rule / ownership:** This file is owned by DP-DEPLOY; no other DP may create or edit a `vercel.json` at root. Re-defining settings in another file is a defect.

### `package.json` scripts owned by this plan (no single M number — table row)

- **File:** `package.json` at repo root (EDIT, not create).
- **Exports:** two keys under `scripts`:
  - `"build": "vite build"` — required because chassis `config/deploy/vercel.json` sets `buildCommand: npm run build` while chassis only defines `build:ui`. **This missing script is a real, present defect in the working copy** — plan states this verbatim in §2, §3, and §6.
  - `"preview": "vite preview --port 4173"` — local preview on fixed port 4173.
- **Signatures (JSON literals):**
  ```json
  {
    "scripts": {
      "build": "vite build",
      "preview": "vite preview --port 4173"
    }
  }
  ```
- **Ownership table row (S7):** `build → DP-DEPLOY → vite build`, `preview → DP-DEPLOY → vite preview --port 4173`. Existing chassis keys `dev`, `build:ui`, `deploy`, `deploy:verify`, `demodrive`, etc. are read-only and MUST NOT be touched.
- **Consumers:** Vercel `buildCommand`, developer `npm run build`, `npm run preview`.
- **Import rule:** No other plan touches `build` or `preview` keys.

### Root `.env.example` (owned by this plan, additive to chassis)

- **File:** `.env.example` at repo root (CREATE; complements chassis `config/env.example` which is read-only).
- **Content (normative literal, no real secrets):**
  ```
  # DP-DEPLOY root .env.example — complement to config/env.example (chassis read-only)
  # .env is already git-ignored. Copy to .env locally after first deploy.
  ASSEMBLYAI_API_KEY=
  MOCKRILL_LLM_MODEL=claude-sonnet-4-6
  MOCKRILL_LLM_FALLBACK_MODEL=qwen3.5-4b-32k-fast
  # PUBLIC_URL is set locally after deploy, e.g. https://your-app.vercel.app
  # PUBLIC_URL=
  # VERCEL_TOKEN and VERCEL_PROJECT_ID are for npm run deploy only (local .env, never committed)
  # VERCEL_TOKEN=
  # VERCEL_PROJECT_ID=
  ```
  Values are placeholders / defaults; no real key is ever committed. Comments explain that `config/env.example` is chassis read-only so these three vars live here.
- **Consumers:** Human developer copying to `.env`, CI lint that checks example exists.
- **Import rule:** This file is owned by DP-DEPLOY; DP-DEMOPROOF, DP-INTERVIEWER etc. do not add keys here — they document their vars in the env table but the file lives here.

## §4 Contracts CONSUMED by this plan

| # | Import path | Export | Signature | Owning module / DP |
|---|---|---|---|---|
| C1 | `package.json` (repo root file) | `version` field | `string` (e.g. `"0.0.0"`) used as `version` in health response | Chassis / repo root (no DP) |
| C2 | `process.env.VERCEL_GIT_COMMIT_SHA` | env var | `string \| undefined` — commit SHA injected by Vercel; plan reads `process.env.VERCEL_GIT_COMMIT_SHA ?? "local"` | Vercel platform |
| C3 | `config/deploy/vercel.json` (chassis, read-only) | `framework`, `buildCommand`, `outputDirectory`, `installCommand`, `headers` on `/events` | JSON: `framework:vite`, `buildCommand: npm run build`, `outputDirectory: dist`, `installCommand: npm ci`, SSE headers `no-cache,no-transform` + `no` buffering | Chassis deploy config (read-only) |
| C4 | `config/env.example` (chassis, read-only) | env example | Existing chassis file listing `THEME`, `TRANSPORT`, etc.; this plan does NOT edit it | Chassis |
| C5 | `scripts/smoke-deploy.ts` + `scripts/deploy.ts` (chassis) | deploy/verify runners | `npm run deploy` prints `[deploy] OK vercel <url> in <ms>ms`; `npm run deploy:verify` polls `GET $PUBLIC_URL/health` and expects `PASS <ms>ms (attempt N, status 200)` | Chassis platform scripts |
| C6 | `src/platform/deploy/adapters/` (chassis) | fallback providers `replit`, `docker` | One-line `DEPLOY_PROVIDER` switch via chassis `src/platform/config/env.ts` | Chassis platform deploy adapters |

**Rules:**
- This plan MUST NOT re-implement, re-type, or stub any of the above. `package.json` version MUST be read via `createRequire`/`readFileSync`/JSON import, never hard-coded.
- `config/deploy/vercel.json` and `config/env.example` are chassis read-only — MUST NOT be edited. The plan's root `vercel.json` and root `.env.example` are the only deploy-owned config files.
- No import from `src/media`, `src/cost`, `src/dev`, `src/pgm`, `src/profile`, `src/assembly` — they are excluded and absent.
- Health handler MUST NOT import `ASSEMBLYAI_API_KEY`, `withResilience`, or any `src/mockrill/*` module — it is intentionally dependency-free so it returns 200 even when everything else is broken.
- No secret is read by this plan's files (`api/health.ts` reads only `VERCEL_GIT_COMMIT_SHA`).

## §5 Algorithms

### A1 `api/health.ts` handler algorithm (M40) — dependency-free smoke target

```
1. If req.method !== "GET":
   a. res.setHeader("Allow", "GET")
   b. res.status(405).json({ error: "method_not_allowed" })
   c. return
2. Resolve version:
   a. try: import { createRequire } from "module"; const require = createRequire(import.meta.url); const { version } = require("../package.json") as { version: string };  // path is ../ from api/ to repo root
   b. catch: version = "0.0.0"  // fallback literal if read fails (never throw)
   c. if typeof version !== "string" or version.trim()==="" then version = "0.0.0"
3. Resolve commit:
   a. commit = process.env.VERCEL_GIT_COMMIT_SHA ?? "local"
   b. if typeof commit !== "string" or commit.trim()==="" then commit = "local"
4. Set header: res.setHeader("Content-Type", "application/json") // and implicitly Cache-Control: no-cache? not required
5. res.status(200).json({ ok: true, version, commit }); return
// MUST NOT access ASSEMBLYAI_API_KEY, withResilience, makeDegradedResult, or any src/mockrill/*.
// MUST NOT throw. Any unexpected error → catch and res.status(500).json({ error: "internal" }) but prefer to never throw at all.
```
Literal `version` source is repo-root `package.json`. `commit` fallback is literal `"local"`. No auth header is read. The handler is intentionally the simplest possible function so it proves the deployment boots even if LLM/token/DB layers are broken.

### A2 Root `vercel.json` construction algorithm (M41) — additive over chassis

```
1. Read chassis file config/deploy/vercel.json (DO NOT EDIT IT). Its fields are framework:vite, buildCommand:npm run build, outputDirectory:dist, installCommand:npm ci, headers for /events (no-cache/no-transform + no buffering). Treat as source of truth.
2. Create new file vercel.json at repo root with JSON:
   - $schema: https://openapi.vercel.sh/vercel.json
   - $comment: "DP-DEPLOY: root vercel.json additive over config/deploy/vercel.json (chassis read-only); adds /health rewrite, /api/aai-token no-store, nodejs20.x runtime. No secrets here."
   - framework, buildCommand, outputDirectory, installCommand copied verbatim from chassis.
   - rewrites: [{ source: "/health", destination: "/api/health" }]
   - headers: two entries — (a) source /events with Cache-Control no-cache,no-transform + X-Accel-Buffering no  (from chassis), (b) source /api/aai-token with Cache-Control no-store
   - functions: { "api/**/*.ts": { runtime: "nodejs20.x" } }
3. Do NOT add any secret key or env var value to the JSON.
4. Verify: node -e "const j=require('./vercel.json'); if(j.rewrites[0].source!=='/health') throw; console.log('vercel.json OK:'+j.framework)"
```
Known trap callout (must appear in plan text and in vercel.json $comment): Vercel serverless functions live under `/api/*` but `scripts/smoke-deploy.ts` polls `GET $PUBLIC_URL/health` (no /api). Without the rewrite `deploy:verify` fails on a perfectly good deployment.

### A3 `package.json` scripts edit algorithm

```
1. Read package.json as JSON.
2. If scripts.build already exists and equals "vite build" — leave it (idempotent).
3. Else set scripts.build = "vite build". If it was something else (e.g. missing — which is the current defect), overwrite.
4. If scripts.preview already equals "vite preview --port 4173" — leave it.
5. Else set scripts.preview = "vite preview --port 4173".
6. Do NOT touch any other scripts key (dev, build:ui, deploy, deploy:verify, demodrive, faqdef, test, typecheck, etc.). No other DP touches these two keys.
7. Write file back preserving formatting (2-space indent).
```
Note to implementor (must appear in plan): The chassis only defines `build:ui` (`vite build`); `config/deploy/vercel.json` sets `buildCommand: npm run build`. The missing `build` script is a real, present defect in the working copy — this plan fixes it.

### A4 Root `.env.example` construction (env NFR-04)

```
1. Create file .env.example at repo root (if exists, merge — keep existing chassis vars if any, but add our three).
2. Write content literally:
   # DP-DEPLOY root .env.example — complement to config/env.example (chassis read-only)
   # .env is already git-ignored. Copy to .env locally after first deploy.
   ASSEMBLYAI_API_KEY=
   MOCKRILL_LLM_MODEL=claude-sonnet-4-6
   MOCKRILL_LLM_FALLBACK_MODEL=qwen3.5-4b-32k-fast
   # PUBLIC_URL is set locally after deploy, e.g. https://your-app.vercel.app
   # PUBLIC_URL=
   # VERCEL_TOKEN and VERCEL_PROJECT_ID are for npm run deploy only (local .env, never committed)
   # VERCEL_TOKEN=
   # VERCEL_PROJECT_ID=
3. Do NOT write any real key value; values are empty or defaults.
4. State: config/env.example is chassis read-only, so these additions go in new root file; .env already git-ignored.
```

### A5 Health smoke verification (local)

```
1. Start local dev or build+preview: npm run build && npm run preview -- or npx vite preview? This plan's preview is vite preview --port 4173.
2. Curl: curl -i http://localhost:4173/api/health  and curl -i http://localhost:4173/health (requires vite proxy or vercel dev; locally /health rewrite is not automatic, so test direct /api/health; after deploy both work).
3. Expect: 200 { ok:true, version: <from package.json>, commit: "local" } locally (commit is "local" because VERCEL_GIT_COMMIT_SHA not set). After Vercel deploy commit is SHA.
4. Verify script: npm run deploy:verify does GET $PUBLIC_URL/health and expects PASS <ms>ms (attempt N, status 200)
```

### A6 Deploy runbook (numbered, copy-pasteable — see §6 for full text) and rollback/provider switch

```
Rollback runbook:
1. List deployments: npx vercel ls
2. Rollback: npx vercel rollback --token=$VERCEL_TOKEN  (or npm run deploy:rollback if chassis exposes runRollback via scripts/deploy.ts)
3. Verify rollback: npm run deploy:verify  →  PASS line again on previous URL
Provider fallback (chassis adapters already present):
1. Inspect src/platform/deploy/adapters/ → replit/ docker/ subfolders (do not edit chassis).
2. Set env DEPLOY_PROVIDER=replit  or DEPLOY_PROVIDER=docker  (one-line switch read by src/platform/config/env.ts).
3. Re-run deploy adapter entrypoint as per chassis provider.json (e.g. replit uses replit deployment, docker uses docker build).
Non-negotiable stated in plan: Audio never proxies through a serverless function — Vercel functions cannot hold long-lived sockets; design is browser → AssemblyAI direct. Reject any later proposal for a WebSocket relay in api/. Three functions only: api/aai-token.ts, api/turn.ts, api/health.ts.
```

## §6 Configuration, environment & files

### Env vars (complete table per prompt — 7 rows)

| var | set in | read by | missing → |
|---|---|---|---|
| `ASSEMBLYAI_API_KEY` | Vercel project env (Production + Preview) and local `.env` | `api/aai-token.ts`, `api/turn.ts` only (server side, never browser) | `GET /api/aai-token` returns `503` degraded `{ reason: "aai_key_missing", fallback_source: "none" }` via `makeDegradedResult`; app falls to golden replay via `RES_FORCED_DEGRADED` path in `src/resilience` (rung 1) |
| `MOCKRILL_LLM_MODEL` | optional — Vercel env or `.env` | `api/turn.ts` (server-only) | defaults to `claude-sonnet-4-6` |
| `MOCKRILL_LLM_FALLBACK_MODEL` | optional | `api/turn.ts` | defaults to `qwen3.5-4b-32k-fast` |
| `RES_FORCED_DEGRADED` | set to `1` only for a rung-2 demo / golden replay | `src/resilience` `withResilience` kill switch (`RES_FORCED_DEGRADED=1` → every wrapped call serves its golden cache entry) | unset = live behavior; absent is normal production |
| `PUBLIC_URL` | local `.env` after `npm run deploy` (put the printed URL there) | `scripts/smoke-deploy.ts` (chassis `deploy:verify` polls `GET $PUBLIC_URL/health`) | smoke polls `http://localhost:3000` (default fallback) and will fail if no deployment has been made |
| `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` | local `.env` (never committed) | `npm run deploy` (`scripts/deploy.ts` → chassis `src/platform/deploy`) | deploy fails with a clear message (`missing VERCEL_TOKEN`); not a silent miss |
| `THEME`, `TRANSPORT`, `API_BASE`, `DEPLOY_PROVIDER` | optional — local `.env` or Vercel env | chassis `src/platform/config/env.ts` (theme/transport/apiBase/deploy provider defaults) | documented chassis defaults (`minimal` theme, `sse` transport, relative `API_BASE`, `vercel` provider) — no crash |

**Bare table as in prompt (for quick scan):** variable · where it is set · who reads it · what happens when it is missing — see table above. No secret is ever written into `vercel.json`, `.env.example`, a fixture, or a log line.

### `.env.example` note (must appear in plan text)

Your plan adds `ASSEMBLYAI_API_KEY`, `MOCKRILL_LLM_MODEL` and `MOCKRILL_LLM_FALLBACK_MODEL` to a **new root `.env.example`** — state that `config/env.example` is chassis and read-only, so the additions go in the new root file, and that `.env` is already git-ignored (listed in `.gitignore`). The new file contains placeholder/empty values only, never a real key.

### Config files

- `vercel.json` at repo root — owned by this plan (M41), additive over chassis `config/deploy/vercel.json` (which is read-only). No secret in it.
- `config/deploy/vercel.json` — chassis, read-only, contains `framework: vite`, `buildCommand: npm run build`, `outputDirectory: dist`, `installCommand: npm ci`, SSE headers on `/events`. Must not be edited.
- `config/env.example` — chassis, read-only — existing defaults for `THEME`/`TRANSPORT`/`API_BASE`/`DEPLOY_PROVIDER` etc. This plan does not edit it.
- `.env.example` at repo root — new file owned by this plan listing three vars above.
- `.env` — git-ignored, holds real `ASSEMBLYAI_API_KEY` locally and `PUBLIC_URL` after deploy; never committed.
- `package.json` — edited only to add `build` and `preview` scripts.
- `tsconfig.json` / `vite.config.ts` — already `strict:true`, `moduleResolution:NodeNext`, `noUncheckedIndexedAccess:true`, `jsx:react-jsx`, `paths:{"src/*":["./src/*"]}`; no edit.
- `src/platform/deploy/adapters/` — chassis already has `replit`, `docker` fallback providers; read-only.

### The deploy runbook (numbered, copy-pasteable — exact text implementor must write into plan and README snippet)

1. `npm ci`
2. `npm run build` → expected `dist/` output line containing `built in` and exit 0 (Vite writes `dist/index.html` and assets)
3. `npx vercel link` (once), set the three env vars (`ASSEMBLYAI_API_KEY`, `MOCKRILL_LLM_MODEL`, `MOCKRILL_LLM_FALLBACK_MODEL`) in the Vercel dashboard (Production + Preview) — `MOCKRILL_LLM_*` optional with defaults
4. `npm run deploy` → prints `[deploy] OK vercel <url> in <ms>ms` (exact prefix `[deploy] OK vercel` is what chassis `scripts/deploy.ts` prints)
5. Put that URL into `.env` as `PUBLIC_URL=https://<your-app>.vercel.app`
6. `npm run deploy:verify` → expected `PASS <ms>ms (attempt N, status 200)` (chassis `scripts/smoke-deploy.ts` polls `GET $PUBLIC_URL/health` with retry; literal string `PASS` is the signal)
7. Open the URL, confirm the browser grants the mic on HTTPS (lock icon, permission prompt), run one 30-second session, and confirm the scorecard renders.

**Rollback path (must appear right after runbook):**
- `npx vercel rollback` (or `npx vercel rollback --token=$VERCEL_TOKEN`) — via `runRollback` in chassis `scripts/deploy.ts` / `src/platform/deploy`.
- Verify rollback: re-run `npm run deploy:verify` → `PASS` again on previous deployment URL.

**Fallback providers (already present, do not re-implement):**
- `src/platform/deploy/adapters/replit` and `src/platform/deploy/adapters/docker` already exist (chassis). Switch with one-line env `DEPLOY_PROVIDER=replit` or `DEPLOY_PROVIDER=docker` read by `src/platform/config/env.ts`. No new adapter is added by this plan.

### Complete file map — everything this plan creates or edits

| Path | Action | Description |
|---|---|---|
| `api/health.ts` | **CREATE** | M40 handler `GET /api/health` → `{ ok:true, version, commit }`; `/health` via rewrite |
| `vercel.json` (repo root) | **CREATE** | M41 config: vite framework, `npm run build`, `dist`, `/health` rewrite (known trap), SSE headers + `no-store` on `/api/aai-token`, `functions` runtime `nodejs20.x`; `$comment` about chassis read-only |
| `package.json` | **EDIT** (add 2 keys) | `build: vite build` + `preview: vite preview --port 4173` — only those two; missing build is present defect |
| `.env.example` (repo root) | **CREATE** | Root example adding `ASSEMBLYAI_API_KEY`, `MOCKRILL_LLM_MODEL`, `MOCKRILL_LLM_FALLBACK_MODEL`; states `config/env.example` is chassis read-only; `.env` already git-ignored |
| `private/design_documents/design_plans/DP-DEPLOY.md` | **CREATE** | This plan |

No other path. `config/deploy/vercel.json`, `config/env.example`, `src/resilience/`, `src/platform/` etc. are explicitly NOT edited.

## §7 Failure & degradation behavior

| # | Failure | Detection | DegradedResult / HTTP status | What the user sees | Fallback-ladder rung (DP-DEMOPROOF `docs/fallback-ladder.md`) |
|---|---|---|---|---|---|
| F-DEP-01 | `GET /api/health` called with non-GET method | `req.method !== "GET"` | `405 { error: "method_not_allowed" }` with `Allow: GET` | Curl / script gets 405; no crash | N/A — health is not wrapped with `withResilience` |
| F-DEP-02 | Unknown / missing `package.json` version read throws | `try/catch` around `require("../package.json")` | No DegradedResult — handler falls back to `version: "0.0.0"` and still returns `200` | Smoke still sees `200 { ok:true }` | N/A |
| F-DEP-03 | Root `vercel.json` missing the `/health` rewrite | `deploy:verify` polls `$PUBLIC_URL/health` → 404 | HTTP 404 (not DegradedResult) | `npm run deploy:verify` reports `FAIL ... status 404` even though `/api/health` works — known trap. Fix: add `{"source":"/health","destination":"/api/health"}` | N/A (config trap, not runtime) |
| F-DEP-04 | `ASSEMBLYAI_API_KEY` missing (health MUST NOT be affected) | `api/aai-token.ts` checks `!process.env.ASSEMBLYAI_API_KEY` → 503 degraded | `DegradedResult { reason: "aai_key_missing", fallback_source: "none" }` from token endpoint; **health still returns 200** | User sees app fall to golden replay; health smoke still `PASS` because health has no key dependency — by design | Rung 1 — replay (golden cache) via `RES_FORCED_DEGRADED` or token endpoint fallback |
| F-DEP-05 | `npm run build` fails because `build` script missing or `vite build` errors | `npm run build` exit non-zero | No DegradedResult — Vercel build fails (`buildCommand: npm run build` not found) | Vercel dashboard shows build failed; fix is adding `build: vite build` — the present defect this plan fixes | N/A |
| F-DEP-06 | `GET /api/aai-token` cached by CDN/proxy despite 60s expiry | Header `Cache-Control: no-store` on `/api/aai-token` ensures no cache | If missed, token may be reused past 60s → 401 from AssemblyAI on next socket open | Client shows `aai_token_unavailable` degraded; fix is ensuring `vercel.json` headers include `no-store` for `/api/aai-token` | Rung 2–3 — cache → none |
| F-DEP-07 | Vercel functions default runtime drifts (e.g. Node 18) | `functions: { "api/**/*.ts": { runtime: "nodejs20.x" } }` pins to Node 20+ | If missing, function may run on Node 18 and violate `engines: >=20` | Build/run warnings; pin fixes | N/A |
| F-DEP-08 | `GET /health` polls via http (not https) locally | Local `vite preview --port 4173` serves http; smoke fallback is `http://localhost:3000` | Not a DegradedResult — smoke script handles localhost | Local `curl http://localhost:4173/api/health` still 200; deployed must be https for `getUserMedia` | Rung 4 — local dev |

Invariant: `api/health.ts` never throws to user — it returns `200` even if every other module is broken, because it is the smoke target. No `DegradedResult` is produced by health; degraded paths are owned by DP-AAI-STREAM (`aai_key_missing`) and DP-INTERVIEWER.

## §8 Public surface & import rules

### What is exported (public surface)

- `api/health.ts` → default handler `GET /api/health` (also `GET /health` via rewrite). No barrel.
- `vercel.json` (repo root) → Vercel config (JSON, not a JS export). No barrel.
- `package.json` scripts `build` (`vite build`) and `preview` (`vite preview --port 4173`). No barrel.
- `.env.example` (repo root) → env template (not a code export).

There is no `src/mockrill/*` barrel for this plan; the only code file is `api/health.ts` at repo root.

### What is internal

- Version-read helper inside `api/health.ts` (createRequire logic) — not exported.
- `$comment` field inside `vercel.json` — documentation only.
- No internal re-export of chassis `config/deploy/vercel.json`.

### Import rules (binding)

1. `api/health.ts` MUST NOT import `ASSEMBLYAI_API_KEY`, `withResilience`, `makeDegradedResult`, `isDegradedResult`, or any `src/mockrill/*`, `src/platform/*`, `src/resilience/*` module. It reads only `process.env.VERCEL_GIT_COMMIT_SHA` and `package.json` version.
2. `vercel.json` MUST NOT contain any secret string; grep `vercel.json` for `ASSEMBLYAI` must be zero.
3. No file in `api/` or root config may use a deep chassis import — chassis is read-only and health deliberately has zero chassis dependency.
4. `config/deploy/vercel.json` is chassis read-only — no edit, no copy-paste-then-modify that drifts; root `vercel.json` is additive and must carry the chassis fields verbatim.
5. Exactly three serverless functions ship: `api/aai-token.ts` (DP-AAI-STREAM), `api/turn.ts` (DP-INTERVIEWER), `api/health.ts` (this plan). Adding a fourth needs a blueprint amendment. Any proposal for `api/ws.ts` / WebSocket relay in `api/` is rejected — Vercel functions cannot hold long-lived sockets; design is browser → AssemblyAI direct.
6. `package.json` keys `build` and `preview` are owned only by this plan; no other DP touches them. Chassis keys (`dev`, `build:ui`, `deploy`, `deploy:verify`, etc.) are read-only.

## §9 Work units

### WU-DEP-01 — add `build` and `preview` scripts; verify `npm run build` succeeds

- **Goal:** Fix the present defect: chassis only defines `build:ui` but `config/deploy/vercel.json` `buildCommand` is `npm run build`. Without this, Vercel build fails. Add exactly two scripts.
- **Depends on:** none (first; but read `package.json` and `config/deploy/vercel.json` first without editing chassis).
- **Files touched:** `package.json` (EDIT)
- **Implementation steps:**
  1. Read `package.json` JSON.
  2. Assert `config/deploy/vercel.json` `buildCommand` is `npm run build` (confirming the defect — `build` is missing while `build:ui` exists).
  3. Set `scripts.build = "vite build"`; set `scripts.preview = "vite preview --port 4173"`. Do not touch any other `scripts` key.
  4. Write `package.json` back with 2-space indent.
  5. Run `npm run build` locally — ensures `dist/` is written (Vite out). No network needed.
- **Verification command (ONE runnable line):**
  ```sh
  npm run build
  ```
- **Expected output (must contain, verbatim tail):**
  ```
  built in
  ```
  and exit 0, plus `dist/index.html` exists. Vite also prints `building for production` / `✓` lines. The literal `built in` is the stable Vite success marker. If script missing, npm errors `missing script: build` — that's the defect this WU must fix.
- **Done-when:** `package.json` contains `scripts.build === "vite build"` and `scripts.preview === "vite preview --port 4173"`, and `npm run build` exits 0 with `dist/` containing `index.html`.

### WU-DEP-02 — `api/health.ts` (M40); verify locally with `curl` and the exact expected JSON

- **Goal:** Create the smoke target: `GET /api/health` → `200 { ok: true, version, commit }` dependency-free.
- **Depends on:** WU-DEP-01 (`npm run build` context) but can run in parallel.
- **Files touched:** `api/health.ts` (CREATE)
- **Implementation steps:**
  1. Create directory `api/` if not exists.
  2. Create `api/health.ts` with:
     ```ts
     import type { VercelRequest, VercelResponse } from "@vercel/node";
     import { createRequire } from "module";
     export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
       if (req.method !== "GET") { res.setHeader("Allow", "GET"); res.status(405).json({ error: "method_not_allowed" }); return; }
       let version = "0.0.0";
       try { const require = createRequire(import.meta.url); const pkg = require("../package.json") as { version?: string }; if (typeof pkg.version === "string" && pkg.version.trim() !== "") version = pkg.version; } catch {}
       const commit = (typeof process.env.VERCEL_GIT_COMMIT_SHA === "string" && process.env.VERCEL_GIT_COMMIT_SHA.trim() !== "") ? process.env.VERCEL_GIT_COMMIT_SHA : "local";
       res.setHeader("Content-Type", "application/json");
       res.status(200).json({ ok: true, version, commit });
     }
     ```
     No `ASSEMBLYAI_API_KEY`, no `withResilience`, no `src/mockrill` import.
  3. Ensure it compiles under `tsc --noEmit` if `@vercel/node` types missing then fallback to `(req: any, res: any)` but keep same logic.
  4. Locally: `npm run build && npm run preview --port 4173` in background then `curl -s http://localhost:4173/api/health` (or `npx vite-node` smoketest that imports handler and mocks req/res).
- **Verification command (ONE runnable line — vite-node that imports real handler from real path and asserts real output, no stub):**
  ```sh
  npx vite-node -e "import h from 'api/health.ts'; const req={method:'GET'}; let code=0; let body=null; const res={ setHeader:()=>{}, status(c){code=c; return { json(b){body=b}};}, json(b){body=b} }; await h(req,res); console.log(JSON.stringify({code, body})); if(code!==200||!body.ok||typeof body.version!=='string'||typeof body.commit!=='string') throw new Error('health bad')"
  ```
  (If direct `vite-node` import of `api/health.ts` is not configured, alternative `node -e` curl-based verification after `npm run build` is: `node -e "const {execSync}=require('child_process'); console.log(require('fs').readFileSync('api/health.ts','utf8').includes('VERCEL_GIT_COMMIT_SHA')?'health imports SHA': 'missing')"` but the vite-node line above is normative; both prove real export is imported.)
- **Expected output:**
  ```
  {"code":200,"body":{"ok":true,"version":"0.0.0","commit":"local"}}
  ```
  `version` matches `package.json` version (currently `0.0.0`); `commit` is `"local"` locally, SHA on Vercel. Both are strings; `ok` is `true`.
- **Done-when:** `api/health.ts` exists, handler returns 200 with correct JSON locally, imports only `@vercel/node` + `module`, and `curl -s http://localhost:4173/api/health | grep '"ok":true'` passes after preview.

### WU-DEP-03 — root `vercel.json` (M41) with the `/health` rewrite; verify the rewrite resolves after deploy

- **Goal:** Create the ONLY file Vercel reads, with the known-trap rewrite, SSE headers, no-store, and Node 20+ runtime.
- **Depends on:** Reads `config/deploy/vercel.json` (chassis read-only) — must not edit it.
- **Files touched:** `vercel.json` at repo root (CREATE)
- **Implementation steps:**
  1. Read `config/deploy/vercel.json` — copy `framework`, `buildCommand`, `outputDirectory`, `installCommand`, and `/events` headers verbatim.
  2. Create repo-root `vercel.json` with literal from §3 M41 (framework vite, buildCommand npm run build, outputDirectory dist, installCommand npm ci, rewrites /health→/api/health, headers for /events + /api/aai-token no-store, functions runtime nodejs20.x, $schema, $comment about chassis read-only).
  3. Include `$comment`: "DP-DEPLOY: root vercel.json additive over config/deploy/vercel.json (chassis read-only); adds /health rewrite (known trap), /api/aai-token no-store, nodejs20.x runtime. No secrets here."
  4. Verify JSON parses: `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('vercel.json parses')"`.
  5. Verify rewrite present: `node -e "const j=require('./vercel.json'); if(!j.rewrites||!j.rewrites.find(r=>r.source==='/health'&&r.destination==='/api/health')) throw new Error('rewrite missing'); console.log('rewrite OK')"`.
- **Verification command (ONE runnable line):**
  ```sh
  node -e "const j=require('./vercel.json'); const r=j.rewrites&&j.rewrites.find(x=>x.source==='/health'&&x.destination==='/api/health'); if(!r) throw new Error('rewrite missing'); if(j.framework!=='vite'||j.buildCommand!=='npm run build'||j.outputDirectory!=='dist'||j.installCommand!=='npm ci') throw new Error('chassis fields drift'); const h=j.headers&&j.headers.find(x=>x.source==='/api/aai-token'); if(!h||!h.headers.find(y=>y.key==='Cache-Control'&&y.value==='no-store')) throw new Error('no-store missing'); if(!j.functions||!j.functions['api/**/*.ts']||!j.functions['api/**/*.ts'].runtime.includes('20')) throw new Error('runtime not pinned'); console.log('M41 OK rewrite+fields+pinned')"
  ```
- **Expected output:**
  ```
  M41 OK rewrite+fields+pinned
  ```
  If any check fails, throws and does not print this line.
- **Done-when:** Repo-root `vercel.json` exists (separate from `config/deploy/vercel.json` which remains untouched), contains rewrite, carried chassis fields, no-store on aai-token, runtime nodejs20.x, and verification line prints.

### WU-DEP-04 — root `.env.example` and the env table

- **Goal:** Document every env var (7 rows) and create the new root `.env.example` complementing chassis `config/env.example`.
- **Depends on:** none (read chassis `config/env.example` to confirm it's there and read-only).
- **Files touched:** `.env.example` at repo root (CREATE)
- **Implementation steps:**
  1. Read `config/env.example` (confirm exists, do not edit).
  2. Create `.env.example` at repo root with literal from §3 (header comment about chassis read-only, ASSEMBLYAI_API_KEY empty, MOCKRILL_LLM_MODEL=claude-sonnet-4-6, MOCKRILL_LLM_FALLBACK_MODEL=qwen3.5-4b-32k-fast, commented PUBLIC_URL/VERCEL_TOKEN/VERCEL_PROJECT_ID).
  3. Ensure `.gitignore` already lists `.env` (it does via chassis); do not edit `.gitignore`.
  4. Confirm no secret in file: real key must not appear.
- **Verification command (ONE runnable line):**
  ```sh
  node -e "const fs=require('fs'); const s=fs.readFileSync('.env.example','utf8'); if(!s.includes('ASSEMBLYAI_API_KEY')) throw new Error('missing ASSEMBLYAI'); if(!s.includes('MOCKRILL_LLM_MODEL=claude-sonnet-4-6')) throw new Error('model missing'); if(!s.includes('MOCKRILL_LLM_FALLBACK_MODEL=qwen3.5-4b-32k-fast')) throw new Error('fallback missing'); if(s.match(/sk-[A-Za-z0-9]/)) throw new Error('secret leaked'); console.log('env.example OK')"
  ```
- **Expected output:**
  ```
  env.example OK
  ```
- **Done-when:** `.env.example` exists, contains three vars with placeholder/defaults, chassis `config/env.example` untouched, `.env` remains git-ignored, verification prints.

### WU-DEP-05 — first real deploy + `deploy:verify`, with the exact expected `PASS` line

- **Goal:** Smoke the deployment end-to-end via chassis scripts. This is the gate.
- **Depends on:** WU-DEP-01 (`build`), WU-DEP-02 (`health`), WU-DEP-03 (`vercel.json` with rewrite).
- **Files touched:** `.env` (EDIT to add `PUBLIC_URL` after deploy) — no code file.
- **Implementation steps:**
  1. `npm ci` — deterministic install.
  2. `npm run build` — must exit 0, writes `dist/`.
  3. `npx vercel link` (once) — links to Vercel project; set env vars in Vercel dashboard: `ASSEMBLYAI_API_KEY` (Production+Preview), optionally `MOCKRILL_LLM_MODEL`/`MOCKRILL_LLM_FALLBACK_MODEL`.
  4. `npm run deploy` — chassis `scripts/deploy.ts` deploys via Vercel API (`VERCEL_TOKEN`+`VERCEL_PROJECT_ID` from local `.env`). Must print `[deploy] OK vercel <url> in <ms>ms`. Record `<url>`.
  5. Put that URL into local `.env` as `PUBLIC_URL=https://<...>.vercel.app`.
  6. `npm run deploy:verify` — chassis `scripts/smoke-deploy.ts` polls `GET $PUBLIC_URL/health` (via rewrite to `/api/health`) with retry; must print `PASS <ms>ms (attempt N, status 200)`.
- **Verification command (ONE runnable line — after steps 4–5):**
  ```sh
  npm run deploy:verify
  ```
- **Expected output (tail, must contain literally):**
  ```
  PASS <number>ms (attempt <number>, status 200)
  ```
  Example: `PASS 142ms (attempt 1, status 200)`. The literal `PASS` and `status 200` are required. `npm run deploy` prior must have printed `[deploy] OK vercel https://... in <ms>ms`.
- **Done-when:** Deployed URL is live, `PUBLIC_URL` is set in `.env`, `deploy:verify` prints `PASS ... (attempt N, status 200)`.

### WU-DEP-06 — HTTPS microphone verification on the deployed URL, with a written pass/fail checklist

- **Goal:** Confirm `getUserMedia` works on the secure origin (https) — submission requires interactive evaluation.
- **Depends on:** WU-DEP-05 (deployed URL exists).
- **Files touched:** none code — checklist written into this plan (and optionally `docs/deploy-checklist.md` but not required; checklist lives in this plan's WU text).
- **Implementation steps:**
  1. Open `PUBLIC_URL` (the `https://...vercel.app` URL) in Chrome/Firefox.
  2. Check HTTPS lock in address bar (not http, not localhost).
  3. Click "Start screening call" → browser shows mic permission prompt; click Allow.
  4. Observe: live transcript appears in `LiveCall` screen, question is spoken via `speechSynthesis`.
  5. Run one 30-second session to completion; confirm scorecard renders (evidence quotes with `label` mm:ss, overall, Re-drill button).
  6. Record result per checklist below.
- **Verification command (MANUAL — write result, no automated line; but still create a written artifact):**
  ```sh
  node -e "console.log('CHECKLIST\\n- HTTPS lock: PASS/FAIL\\n- getUserMedia permission prompt shown: PASS/FAIL\\n- live transcript streaming: PASS/FAIL\\n- speechSynthesis question spoken or text fallback: PASS/FAIL\\n- 30-sec session scorecard renders with 07:42-style quotes: PASS/FAIL')"
  ```
- **Expected output (the checklist template itself):**
  ```
  CHECKLIST
  - HTTPS lock: PASS/FAIL
  - getUserMedia permission prompt shown: PASS/FAIL
  - live transcript streaming: PASS/FAIL
  - speechSynthesis question spoken or text fallback: PASS/FAIL
  - 30-sec session scorecard renders with 07:42-style quotes: PASS/FAIL
  ```
  All five must be `PASS` for WU to be done. If any `FAIL`, note remediation (e.g. mixed-content, Vercel domain not https, mic denied). `getUserMedia` only works on a secure origin — so http or missing lock is an automatic FAIL.
- **Done-when:** Checklist written, manually executed on deployed HTTPS URL, all five PASS, scorecard renders.

### WU-DEP-07 — rollback and alternate-provider runbook

- **Goal:** Document rollback (`runRollback` via `npx vercel rollback`) and fallback providers (`replit`, `docker`) with one-line `DEPLOY_PROVIDER` switch — chassis already ships adapters.
- **Depends on:** WU-DEP-05 (a deployment exists to roll back).
- **Files touched:** none code — documentation in this plan (and `docs/fallback-ladder.md` rung reference via DP-DEMOPROOF, but not edited here).
- **Implementation steps:**
  1. Document rollback: `npx vercel ls` to list, `npx vercel rollback` (or `npx vercel rollback --token=$VERCEL_TOKEN`) to revert; chassis `scripts/deploy.ts` may expose `runRollback` helper. Verify with `npm run deploy:verify` → `PASS` again on previous URL.
  2. Document fallback providers: `src/platform/deploy/adapters/replit` and `src/platform/deploy/adapters/docker` already present; switch with `DEPLOY_PROVIDER=replit` or `DEPLOY_PROVIDER=docker` (one-line env) read by `src/platform/config/env.ts`; no new adapter is added.
  3. State non-negotiable: Audio never proxies through a serverless function; Vercel cannot hold long-lived sockets; design is browser → AssemblyAI direct. Reject any later plan proposing `api/ws.ts` relay.
  4. State exactly three functions ship: `api/aai-token.ts`, `api/turn.ts`, `api/health.ts`; adding a fourth needs blueprint amendment.
- **Verification command (ONE runnable line proving fallback adapters exist as chassis):**
  ```sh
  node -e "const fs=require('fs'); const a=fs.existsSync('src/platform/deploy/adapters/replit')||fs.existsSync('src/platform/deploy/adapters'); console.log(a?'rollback+adapters documented':'missing adapters'); if(!a) throw new Error('adapters missing')"
  ```
  If `src/platform/deploy/adapters/` path differs from chassis, check `config/deploy/` and note; but this literal is the expected chassis path.
- **Expected output:**
  ```
  rollback+adapters documented
  ```
- **Done-when:** Rollback command documented, `DEPLOY_PROVIDER` one-line switch documented, adapters proven to exist (read-only check), non-negotiables stated.

## §10 Acceptance criteria

| # | Requirement | Satisfied by | Check |
|---|---|---|---|
| R-DEP-01 | `build`/`preview` scripts; `npm run build` → `dist/` (fix present defect) | WU-DEP-01 | `package.json` scripts present; `npm run build` prints `built in` and `dist/index.html` exists |
| R-DEP-02 | `api/health.ts` 200 `{ ok:true, version, commit }`; `/health`→`/api/health`; 405 otherwise; no auth/key/dep | WU-DEP-02 | Vite-node import of real `api/health.ts` returns `{code:200, body:{ok:true,version:string,commit:string}}`; curl hits 200 |
| R-DEP-03 | Root `vercel.json` with rewrite (known trap), SSE headers, no-store on aai-token, Node 20+ runtime; `config/deploy/vercel.json` not edited | WU-DEP-03 | `node -e` checks rewrite present, chassis fields carried, no-store present, runtime pinned prints `M41 OK` |
| R-DEP-04 | Root `.env.example` with three vars; env table 7 rows; chassis `config/env.example` read-only; `.env` git-ignored | WU-DEP-04 | `.env.example` contains three vars; `node -e` prints `env.example OK`; no secret leaked |
| R-DEP-05 | 7-step runbook; `npm run deploy` → `[deploy] OK vercel <url>`; `PUBLIC_URL` in `.env`; `deploy:verify` → `PASS ... status 200` | WU-DEP-05 | `npm run deploy:verify` tail contains `PASS <ms>ms (attempt N, status 200)` |
| R-DEP-06 | HTTPS mic verification with 5-item pass/fail checklist; secure origin gate | WU-DEP-06 | Checklist executed on https://...vercel.app, all five PASS, scorecard renders |
| R-DEP-07 | Audio never proxies; exactly 3 functions; no secret in vercel.json/.env.example/log; week-2 deploy | WU-DEP-07 + all WUs | Plan states reject WebSocket relay; three functions enumerated; grep vercel.json for key is zero |
| R-DEP-08 | Every WU has ONE runnable verification + exact expected output; cross-module uses real import path | WU-DEP-01..07 | Each WU header has Verification command + Expected output; WU-DEP-02/03 import real handler/JSON |

## §11 Non-goals

- No new runtime secret beyond `ASSEMBLYAI_API_KEY` — no second API key, no vendor SDK (chassis constraint). Any later plan needing a TTS provider key is rejected.
- No `localStorage`-dependent core behavior and no `localStorage`-based deploy flag — history is in-memory per DP-UI; deploy state is `.env` + Vercel env.
- No WebSocket relay in `api/` — Vercel functions cannot hold long-lived sockets; audio is browser → AssemblyAI direct (see Architecture S4). Any proposal for `api/ws.ts` is a defect.
- No fourth serverless function — exactly three ship (`api/aai-token.ts`, `api/turn.ts`, `api/health.ts`); adding one needs blueprint amendment.
- No proxying or transcoding of audio through a serverless function, no `withResilience` wrapping around health (health is unwrapped by design), no `src/media`/`src/cost`/`src/dev` imports.
- No custom Vercel build plugin or analytics integration — not required for the gate.
- No rewriting of chassis `config/deploy/vercel.json` or `config/env.example` — they are read-only.

## §12 Open questions

| # | Question | Blueprint gap? | Safe default chosen in this plan |
|---|---|---|---|
| Q-DEP-01 | Exact Vercel runtime string — `nodejs20.x` vs `@vercel/node@3.x` vs `nodejs22.x`? | No — chassis says Node ≥20 | Pin to `nodejs20.x` for `api/**/*.ts`; `nodejs22.x` also acceptable if platform defaults to 22, but 20 is minimum binding |
| Q-DEP-02 | Should `/health` rewrite be a Vercel `rewrite` or `redirect`? | Yes — prompt says rewrite | Use `rewrites` (not `redirects`) so URL stays `/health` and status stays 200; redirect would 308 and break smoke script's 200 check |
| Q-DEP-03 | Does local `vite preview` serve the `/health` rewrite without Vercel? | Yes gap | Local `curl http://localhost:4173/health` will 404; verify via `GET /api/health` locally and only after deploy verify `/health`; document this local-vs-deployed difference in WU-DEP-05 |
| Q-DEP-04 | `VERCEL_GIT_COMMIT_SHA` may be undefined locally vs SHA on Vercel — is `local` sentinel okay? | No | Yes — fallback `"local"` is the literal fallback required; smoke test asserts `typeof commit === "string"`, not a specific SHA |
| Q-DEP-05 | Where does `PUBLIC_URL` default (`localhost:3000` vs `:4173`)? | Slight gap | Prompt says smoke polls `http://localhost:3000` when `PUBLIC_URL` missing; preview default is `4173` — plan lists both and says set `PUBLIC_URL` to the deployed `https://` after deploy so the difference only matters pre-deploy |

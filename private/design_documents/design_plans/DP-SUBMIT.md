# DP-SUBMIT — Disclosure, Hygiene, License, Diagram & Submission Copy

## §1 Purpose & scope

### §1.1 What this plan delivers

- **Repo hygiene first (WU-SUB-01 as first work unit)** — adds `private/` to `.gitignore` so `private/design_documents/` and every design plan/blueprint never ship in the public GitHub repo required by submission field 8; confirms `.env`, `*.key`, `credentials*.json`, `.cache/` already covered and no `.env` tracked; verified by `git check-ignore` and `git ls-files`.
- **MIT `LICENSE` (WU-SUB-02, M45/M46 gate)** — original MIT-compliant submission; exact MIT text with copyright year `2026` and holder placeholder, year+holder are the only variable parts.
- **Generated disclosure `disclosure.md` + `architecture-summary.md` (WU-SUB-03)** — pure-function CLIs `provo generate` / `provo summary` from `assembly.manifest.json`; regenerated after any change to `winning_project_plan.md` or `assembly.manifest.json`; includes honest `--ai-log` tool:scope pairs and operator-added section stating pre-built scaffolding vs Sep 1-30 built parts, Path B / LLM Gateway / speechSynthesis choices, and `[unconfirmed]` scaffold-disclosure clause.
- **M45 `docs/architecture.mmd` → `docs/architecture.png` + `docs/chassis-modules.mmd` (WU-SUB-04)** — Mermaid runtime data-flow diagram mirroring S4 plus chassis-module provenance diagram via `deckgen diagram`; complementary pair with exact node labels and render command.
- **`README.md` spin-up guide (WU-SUB-05)** — judge-facing clone-and-run: what/why paragraph, 90-sec quickstart, hosted URL, architecture diagram, offline demo, AssemblyAI features with exact parameter names, license line, pointer to `disclosure.md`; no key/token/transcript.
- **M46 `submission.md` 10 fields + hygiene gate (WU-SUB-06/07) and `docs/repackage.md` runbook (WU-SUB-08)** — generated via `submit format` then hand-tightened; 10 fields with producing plan and acceptance check; `submit hygiene` green with exact verdict line; hard regeneration order after any plan/manifest/URL change; deadline discipline Sep 30 15:00 UTC / internal Sep 24 15:00 UTC.

### §1.2 Explicitly OUT of scope, and which DP owns it instead

| Out-of-scope item | Owning DP | Reason |
|---|---|---|
| Contracts M1-M15 types, steps, envelope, time, schemas | DP-CONTRACTS | Vocabulary / pure helpers; import only |
| Voice streaming M16-M20 (`api/aai-token.ts`, `createMicSource`, `createStreamingClient`) | DP-AAI-STREAM | Mic + streaming; SUBMIT only documents Audio never proxies |
| Turn-taking M21-M23 (`createSpeaker`, `createTurnController`) | DP-TURNTAKING | State machine; SUBMIT does not re-declare |
| Interviewer engine M24-M29 (`TurnRequest`, tools, `chatCompletion`, `api/turn.ts`, `callInterviewer`, question-bank) | DP-INTERVIEWER | LLM orchestration; SUBMIT only references model ids |
| Scoring M30-M36 (`FILLER_LEXICON`, `detectFillers`, `buildEvidence`, rubric, scorecard) | DP-SCORECARD | Scoring logic; SUBMIT only references evidence example |
| UI M37-M39 (`createEventBus`, `useMockrillEvents`, `main.tsx`/`index.html`, screens) | DP-UI | Presentation; SUBMIT only references screens for README |
| Health and vercel M40-M41 (`api/health.ts`, `vercel.json`, build/preview scripts) | DP-DEPLOY | Deployment; SUBMIT consumes `PUBLIC_URL` and hosting = Vercel |
| Fallback ladder M42-M44 (`fixtures/session-golden.json`, `mock-publish.ts`, `fallback-ladder.md`) | DP-DEMOPROOF | Offline replay; SUBMIT references `mock:publish` + preview in README |
| Pitch artifacts (cover PNG 16:9, video MP4 3-5min, slides PDF) — fields 5-7 | DP-PITCH | Producing plan for submission fields 5,6,7; SUBMIT only lists their acceptance check |
| Any `withResilience` wrapping, `ASSEMBLYAI_API_KEY` reading, second API key | DP-AAI-STREAM / DP-INTERVIEWER | SUBMIT owns no `withResilience` and reads no secret |

## §2 Requirements

| # | Requirement | Source | Judging axis |
|---|---|---|---|
| R-SUB-01 | `.gitignore` contains a line `private/` (bare directory pattern, no leading slash needed; `private/` matches `private/design_documents/...`). Reason must be stated: *The design blueprint and every design plan live under `private/design_documents/` and `.gitignore` does NOT currently cover it — without this line the entry's internal strategy documents ship in the public repo required by submission field 8.* Confirm `.env`, `*.key`, `credentials*.json`, `.cache/` already covered and `git ls-files | grep -c '^\.env$'` prints `0` (no `.env` tracked). Verification `git check-ignore -v private/design_documents/master_blueprint_entry.md` prints the matching rule (e.g. `.gitignore:XX:private/`). This is FIRST work unit. | Prompt WU-SUB-01 + git hygiene | Presentation (gate — fail = zero) |
| R-SUB-02 | Root `LICENSE` exists with exact MIT text, copyright year `2026`, holder `Mockrill Contributors` (or repo owner name — plan fixes to `Mockrill Contributors`; year+holder are the only variable parts). Contains `Permission is hereby granted, free of charge...` verbatim MIT body. Brief requires *original and MIT-compliant*. | Prompt LICENSE + submission gate | Presentation (gate) |
| R-SUB-03 | `disclosure.md` generated via `npx vite-node src/provenance/provo/cli.ts generate --manifest assembly.manifest.json --out disclosure.md` and `architecture-summary.md` via `npx vite-node src/provenance/provo/cli.ts summary --manifest assembly.manifest.json`; both are pure functions exiting 0 on success; must be regenerated after ANY change to `winning_project_plan.md` or `assembly.manifest.json`. CLI invoked with `--ai-log` entries listing tool:scope pairs (see §5 A3). | Prompt provo generate/summary | Presentation / Application of Technology |
| R-SUB-04 | Operator-added section in `disclosure.md` (after generated header) states: (a) pre-built non-AI scaffolding = the five included chassis modules `resilience`, `platform`, `context`, `ideation`, `provenance` and that they are author's own open-source scaffolding, reused and disclosed; (b) built inside Sep 1-30 window = everything under `engine/`, `src/mockrill/`, `api/`, the prompts, the question bank, the dialogue policy, the scoring rubric; (c) deliberate choices: Path B browser→AssemblyAI streaming direct, AssemblyAI LLM Gateway for orchestration, browser `speechSynthesis` for voice output instead of TTS vendor; (d) Rule Book's explicit scaffold-disclosure clause was `[unconfirmed]` at kickoff and disclosing regardless is the safe choice. | Prompt disclosure added section | Presentation |
| R-SUB-05 | M45 `docs/architecture.mmd` exists with Mermaid diagram mirroring S4: browser box (`mic` → `streamingClient` → `turnController` → `speaker` → `eventBus` → `screens`), AssemblyAI boxes (`streaming WS wss://streaming.assemblyai.com/v3/ws`, `token endpoint GET https://streaming.assemblyai.com/v3/token`, `LLM Gateway POST https://llm-gateway.assemblyai.com/v1/chat/completions`), three serverless functions (`GET /api/aai-token`, `POST /api/turn`, `GET /api/health` with `/health` rewrite), offline mock path (`scripts/mockrill-mock-publish.ts` SSE → `useEventStream` → same screens). Rendered to `docs/architecture.png` via exact render command (see §5). Also `docs/chassis-modules.mmd` generated via `npx vite-node src/ideation/deckgen/cli.ts diagram --manifest assembly.manifest.json --out docs/chassis-modules.mmd`; note the two diagrams are complementary (runtime data flow vs module provenance). | S4 + M45 rows + deckgen diagram | Presentation / Application of Technology |
| R-SUB-06 | `README.md` spin-up guide at repo root contains exactly: one-paragraph what/why (Mockrill, why voice), 90-sec quickstart (`npm ci`, `cp .env.example .env`, set `ASSEMBLYAI_API_KEY`, `npm run dev`), hosted URL line, architecture diagram image link `![Architecture](docs/architecture.png)`, offline demo section (`npm run preview` + `npm run mock:publish`), AssemblyAI features used with exact parameter names (`speech_model: universal-3-5-pro`, `sample_rate: 16000`, `encoding: pcm_s16le`, `format_turns`, `end_of_turn_confidence_threshold`, `vad_threshold`, `llm-gateway model: claude-sonnet-4-6` fallback `qwen3.5-4b-32k-fast`, `speechSynthesis`), license line (`MIT — see LICENSE`), pointer to `disclosure.md`. Must NOT contain a key, token, or personal transcript. | Prompt README | Presentation |
| R-SUB-07 | M46 `submission.md` generated via `npx vite-node src/provenance/submit/cli.ts format --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out submission.md` then hand-tightened; all 10 fields filled with binding format: 1 title, 2 short description, 3 long description, 4 tags (`AssemblyAI`, `Universal-3.5-Pro`, `Realtime STT`, `LLM Gateway`, `Voice Agent`, `Interview Prep`), 5 cover PNG/JPG 16:9 (DP-PITCH), 6 video MP4 3-5 min (DP-PITCH), 7 slides PDF (DP-PITCH), 8 public GitHub repo URL, 9 hosting platform `Vercel` (DP-DEPLOY), 10 Application URL (DP-DEPLOY). For 5-7 producing plan DP-PITCH and for 9-10 DP-DEPLOY stated; each field has acceptance check. | S1 submission gate + M46 | Presentation |
| R-SUB-08 | Hygiene gate `npx vite-node src/provenance/submit/cli.ts hygiene --manifest assembly.manifest.json --out hygiene-report` exits 0 on pass, exit 1 on explicit `flagged` verdict; outputs still written on flagged; flagged blocks submission until resolved. Expected green verdict line `verdict: pass` (or `hygiene: pass`) — plan states exact line. | Prompt hygiene gate | Presentation (gate) |
| R-SUB-09 | Regeneration order is a hard rule stated in plan: after ANY change to `winning_project_plan.md`, `assembly.manifest.json`, or deployed URL, re-run in exact order `provo generate` → `provo summary` → `deckgen populate` → `script generate` → `faqdef generate` → `submit format` → `submit hygiene`. Pure functions; out-of-order produces `submission.md` disagreeing with `disclosure.md`. Committed as `docs/repackage.md`. | Prompt regeneration order | Presentation |
| R-SUB-10 | Deadline discipline in §10: official Wed 2026-09-30 15:00 UTC; internal target Wed 2026-09-24 15:00 UTC; manual submission available only ≤6h post-deadline with prior organizer approval — never plan around it. | S1 + prompt §10 | Presentation |
| R-SUB-11 | Every work unit WU-SUB-01..08 has Goal, Depends on, Files touched, numbered steps, ONE runnable verification command with exact expected exit code and first line of output; cross-module checks import provider real export where applicable. | S8 quality bar | Presentation |

## §3 Contracts OWNED by this plan

> Rule for every contract below: file path and exported name are exact. Consumers MUST import this from the owning path shown; re-defining, re-typing, stubbing or copying it is a defect.

### M45 `docs/architecture.mmd` / `docs/architecture.png` + `docs/chassis-modules.mmd` — diagrams

- **Files:** `docs/architecture.mmd` (Mermaid source, CREATE), `docs/architecture.png` (rendered PNG, CREATE, 16:9 friendly, ≥1200px wide), `docs/chassis-modules.mmd` (generated via deckgen diagram, CREATE)
- **Exports:** none — docs artifacts, not TS exports. M45 owns Mermaid source + PNG pair.
- **Mermaid shape (normative literal — `docs/architecture.mmd`):**
  ```mermaid
  flowchart LR
    subgraph BROWSER["BROWSER (Vite + React)"]
      MIC["mic\nAudioWorklet PCM s16le 16kHz 200ms"] --> SC["StreamingClient\ncreateStreamingClient"]
      SC <--> |"wss://streaming.assemblyai.com/v3/ws\n?token=<temp>\nBegin/Turn/Termination"] WS["AssemblyAI Streaming WS"]
      SC --> TC["TurnController\nstate machine"]
      TC --> SPK["speaker\nwindow.speechSynthesis"]
      TC <--> BUS["MockrillEventBus\nemit/subscribe"]
      BUS --> HOOK["useMockrillEvents()"]
      HOOK --> SCREENS["React screens\nSetup / LiveCall / ScorecardView / Drill / History\n(chassis UI: StreamingTextRenderer, StepStatusIndicator, CitationDisplay)"]
      TC --> |"POST /api/turn\nTurnRequest → InterviewerAction"] TURN["LLM Gateway\nPOST https://llm-gateway.assemblyai.com/v1/chat/completions\nmodel: claude-sonnet-4-6"]
    end
    subgraph ASSEMBLYAI["AssemblyAI"]
      TOK["Token endpoint\nGET https://streaming.assemblyai.com/v3/token\nexpires_in_seconds 1-600"]
      WS
      TURN
    end
    subgraph SERVERLESS["Vercel serverless (api/*.ts)"]
      ATOK["GET /api/aai-token\nmints token"]
      ATURN["POST /api/turn\nLLM Gateway + tools"]
      AHEALTH["GET /api/health\nGET /health rewrite"]
    end
    ATOK -.->|"Authorization: ASSEMBLYAI_API_KEY"| TOK
    ATURN -.-> TURN
    SC -.->|"GET /api/aai-token → token"| ATOK
    subgraph OFFLINE["OFFLINE mock path"]
      FIX["fixtures/mockrill/session-golden.json"] --> PUB["scripts/mockrill-mock-publish.ts\ncreatePublisher SSE :8787/events/stream"]
      PUB -.->|"SSE"| HOOK
    end
  ```
  Node labels must contain the exact strings: `mic`, `StreamingClient`, `TurnController`, `speaker`, `speechSynthesis`, `MockrillEventBus`, `useMockrillEvents`, `wss://streaming.assemblyai.com/v3/ws`, `GET https://streaming.assemblyai.com/v3/token`, `POST https://llm-gateway.assemblyai.com/v1/chat/completions`, `GET /api/aai-token`, `POST /api/turn`, `GET /api/health`, `scripts/mockrill-mock-publish.ts`, `fixtures/mockrill/session-golden.json`. Plan states the two diagrams are complementary: runtime data flow (this file) vs module provenance (`chassis-modules.mmd`).
- **Render command (normative):** `npx -y @mermaid-js/mermaid-cli@10 mmdc -i docs/architecture.mmd -o docs/architecture.png -b white --width 1600` (or `npx mmdc` if installed). Alternative `npx vite-node` mermaid wrapper is acceptable but plan fixes to `mmdc`. Must exit 0 and produce PNG >0 bytes.
- **Chassis-modules diagram command (normative):** `npx vite-node src/ideation/deckgen/cli.ts diagram --manifest assembly.manifest.json --out docs/chassis-modules.mmd` — pure function, exit 0; re-run after manifest change. Complement note must appear verbatim in plan: *The two diagrams are complementary (one is runtime data flow, one is module provenance).* 
- **Consumers:** `README.md` embeds `docs/architecture.png`; judges; DP-PITCH slide deck may reuse; submission field 7 slides.
- **Import rule:** Consumers MUST reference `docs/architecture.mmd` and `docs/architecture.png` from `docs/`; re-defining diagram elsewhere is a defect.

### M46 `submission.md` — the 10 submission fields

- **File:** `submission.md` at repo root (CREATE, generated then hand-tightened)
- **Exports:** none — markdown doc, not TS export. Owned by DP-SUBMIT.
- **Generation command (normative):** `npx vite-node src/provenance/submit/cli.ts format --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out submission.md` — pure function, exit 0 on success. Must be regenerated after any change to `winning_project_plan.md`, `assembly.manifest.json`, or deployed URL, in the hard order of §5 A8.
- **10-field shape (normative literal — each field heading + binding format):**
  ```md
  # Submission — Mockrill — Realtime AI Mock-Interview Voice Coach
  ## 1. Title
  Mockrill — Realtime AI Mock-Interview Voice Coach
  ## 2. Short description (≤ 280 chars)
  Rehearse spoken technical screens with a realtime voice interviewer that quotes your exact moments and re-drills the weakest answer by voice.
  ## 3. Long description
  (3-5 paragraphs: problem, solution, why AssemblyAI Path B + LLM Gateway + speechSynthesis, business value B2C+B2B)
  ## 4. Tech / category tags
  AssemblyAI, Universal-3.5-Pro, Realtime STT, LLM Gateway, Voice Agent, Interview Prep
  ## 5. Cover image
  `assets/cover-16x9.png` — PNG/JPG 16:9 (DP-PITCH artifact) — acceptance: file exists, 16:9, PNG/JPG
  ## 6. Video
  `assets/demo-3-5min.mp4` — MP4 3-5 min (DP-PITCH artifact) — acceptance: mp4, 180-300s
  ## 7. Slides
  `assets/slides.pdf` — PDF (DP-PITCH artifact) — acceptance: pdf exists
  ## 8. Public GitHub repo URL
  `https://github.com/<org>/<repo>` — must be public; contains no `private/` (verified by .gitignore), no .env tracked — acceptance: URL reachable, repo public
  ## 9. Hosting platform
  Vercel — (DP-DEPLOY) — acceptance: vercel.json present, `api/health.ts` live
  ## 10. Application URL
  `https://<app>.vercel.app` — (DP-DEPLOY `PUBLIC_URL`) — acceptance: GET /health → 200, mic works on https
  ```
  For fields 5-7 producing plan is DP-PITCH; for 9-10 producing plan is DP-DEPLOY — stated verbatim in submission.md comments.
- **Consumers:** lablab.ai submission form (copy-paste), judges, `submit hygiene` reads this file.
- **Import rule:** Consumers MUST import submission.md from repo root; re-defining 10 fields elsewhere is a defect. Generated then hand-tightened — never hand-written from scratch.

### Additional owned artifacts (no M number — part of DP-SUBMIT hygiene/disclosure set)

- **`LICENSE` at repo root** — MIT license text (see §5 A2). Owned by DP-SUBMIT; no other DP touches it.
- **`.gitignore` edit (add `private/`)** — owned by DP-SUBMIT as WU-SUB-01 (first). No other DP edits `.gitignore` for `private/`.
- **`disclosure.md` at repo root** — generated via `provo generate` (see M46 notes) but DP-SUBMIT owns the regeneration discipline and the operator-added section (pre-built vs Sep window, Path B / Gateway / speechSynthesis, `[unconfirmed]` clause). DP-PITCH consumes `disclosure.md` — so DP-SUBMIT runs before DP-PITCH.
- **`architecture-summary.md` at repo root** — generated via `provo summary`; owned regeneration discipline by DP-SUBMIT.
- **`README.md` at repo root** — spin-up guide; owned by DP-SUBMIT (WU-SUB-05).
- **`docs/repackage.md`** — regeneration runbook; owned by DP-SUBMIT (WU-SUB-08).
- **`hygiene-report` (output dir/file from hygiene CLI)** — hygiene output; owned discipline by DP-SUBMIT.

> For every artifact above: Consumers MUST import/reference this from the path shown; re-defining or stubbing it is a defect.

## §4 Contracts CONSUMED by this plan

| # | Import path | Export | Signature | Owning module / DP |
|---|---|---|---|---|
| C1 | `src/provenance/provo/cli.ts` (CLI) | `generate` / `summary` commands | `npx vite-node src/provenance/provo/cli.ts generate --manifest <path> --out <path> [--ai-log <tool:scope>...]` and `summary --manifest <path>`; pure functions, exit 0 on success, exit non-zero on manifest/plan parse error | Chassis `provenance` |
| C2 | `src/provenance/submit/cli.ts` (CLI) | `format` / `hygiene` commands | `npx vite-node src/provenance/submit/cli.ts format --plan <path> --manifest <path> --disclosure <path> --out <path>` (exit 0) and `hygiene --manifest <path> --out <dir>` (exit 1 on flagged, 0 on pass; outputs still written) | Chassis `provenance` |
| C3 | `src/ideation/deckgen/cli.ts` (CLI) | `diagram` (+ `populate`, `validate` — not owned) | `npx vite-node src/ideation/deckgen/cli.ts diagram --manifest <path> --out <path>`; pure function, exit 0 | Chassis `ideation` |
| C4 | `src/ideation/script/cli.ts` | `generate` / `validate` | `npx vite-node src/ideation/script/cli.ts generate --manifest ...` — consumed only to state regeneration order (hard rule) | Chassis `ideation` |
| C5 | `src/ideation/faqdef/cli.ts` | `generate` / `rehearse` | `npx vite-node src/ideation/faqdef/cli.ts generate --manifest ...` — regeneration order only | Chassis `ideation` |
| C6 | `assembly.manifest.json` (repo root) | manifest JSON | `{ includes: ["resilience","platform","context","ideation","provenance"], excludes: ["media","dev-tooling","assembly-advisory","data","cost","pgm","profile"], ... }` — read-only, never edited | Chassis / DP-CONTRACTS boundary |
| C7 | `winning_project_plan.md` (repo root) | winning plan markdown | Markdown with product spec; read-only input to provo + submit CLIs | Repo root (no DP) |
| C8 | `disclosure.md` (generated) | disclosure markdown | Generated by provo; consumed by `submit format` and DP-PITCH | DP-SUBMIT (generated) → DP-PITCH consumer |
| C9 | `package.json` | `version` field | `string` version for health/README context | Chassis / repo |
| C10 | `vercel.json` + `api/health.ts` | deployment config + health endpoint | `framework: vite`, `/health` rewrite, `GET /api/health → 200` | DP-DEPLOY |
| C11 | `fixtures/mockrill/session-golden.json` + `scripts/mockrill-mock-publish.ts` | golden fixture + mock publisher | Offline replay path referenced in architecture diagram and README | DP-DEMOPROOF |

**Rules:** This plan MUST NOT re-implement, re-type, or stub any of the above CLIs. CLIs are invoked via `npx vite-node <path> <command> --manifest ...`, never imported as TS modules. `assembly.manifest.json`, `src/provenance/*`, `src/ideation/*` are chassis read-only — MUST NOT be edited. `winning_project_plan.md` is read-only input. `disclosure.md` is generated, never hand-written; the operator-added section is appended after generation. No import from `src/media`, `src/cost`, `src/dev`, `src/pgm`, `src/profile`, `src/assembly` — they are excluded and absent. `ASSEMBLYAI_API_KEY` is never read by this plan.

## §5 Algorithms

### A1 `.gitignore` `private/` hygiene algorithm (WU-SUB-01 — FIRST)

```
1. Read .gitignore as utf8 string `s`.
2. If `s` contains a line matching /^private\/$/ (exact) → skip to step 5.
3. Else append line `private/` with trailing newline: ensure file ends with \n, then write `private/\n`. Do NOT use `private/**` or `/private/` — use bare `private/`.
4. Verify append: read file, assert `/^private\/$/m.test(s)` is true.
5. Confirm existing coverage: assert s contains `.env` (via `^\.env` or `.env` substring), `*.key`, `credentials*.json` (or `credentials`), `.cache/` — all are already covered in chassis .gitignore; if missing, do NOT add project-specific patterns beyond `private/`.
6. Verify no .env tracked: run `git ls-files | grep -c '^\.env$'` → must print `0`. If non-zero, run `git rm --cached .env` and commit.
7. Verify private is ignored: run `git check-ignore -v private/design_documents/master_blueprint_entry.md` → must print a line containing `.gitignore:XX:private/` (where XX is line number). Must contain `private/` as matching rule.
```
Constants: `.gitignore` path repo root; `private/` literal; `git check-ignore -v` literal command; `git ls-files | grep -c '^\.env$'` literal.

### A2 MIT LICENSE generation algorithm (WU-SUB-02)

```
1. Determine holder = "Mockrill Contributors" (fixed string; alternative repo owner name acceptable but plan fixes to this). Year = "2026" (fixed; the only variable parts are year and holder).
2. Write file LICENSE at repo root with exact MIT text:
   MIT License

   Copyright (c) 2026 Mockrill Contributors

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in all
   copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   SOFTWARE.
3. Verify: `head -n1 LICENSE` must be `MIT License`; `grep -c "2026" LICENSE` must be 1; `grep -c "Mockrill Contributors" LICENSE` must be 1; `grep -c "Permission is hereby granted" LICENSE` must be 1.
```
Year and holder are the only variable parts — state this verbatim in plan.

### A3 `provo generate` + `summary` + operator-added disclosure section (WU-SUB-03)

```
1. Prereqs: `assembly.manifest.json` exists, `winning_project_plan.md` exists, `src/provenance/provo/cli.ts` is chassis read-only.
2. Run generate:
   npx vite-node src/provenance/provo/cli.ts generate --manifest assembly.manifest.json --out disclosure.md --ai-log "cursor:code-generation" --ai-log "vite-node:cli-execution" --ai-log "assemblyai:stt-llm-tts"
   Pure function: reads manifest + plan, writes disclosure.md at repo root, exits 0 on success. `--ai-log` entries are tool:scope pairs so disclosure is honest and specific rather than boilerplate. Required pairs (at least these 3):
     "cursor:code-generation"  (editor AI assistance)
     "vite-node:cli-execution" (CLI invocation)
     "assemblyai:stt-llm-tts"  (AssemblyAI STT + LLM Gateway + speechSynthesis — the mandated tech)
   Additional pairs may be added but these three are mandatory.
3. Verify generate: check `disclosure.md` exists, first line contains `Disclosure` or `Provenance`, exit code 0.
4. Run summary:
   npx vite-node src/provenance/provo/cli.ts summary --manifest assembly.manifest.json
   Pure function, exit 0, prints architecture summary to stdout (or writes architecture-summary.md if --out given). Plan fixes to stdout variant; if CLI supports --out, also run `npx vite-node src/provenance/provo/cli.ts summary --manifest assembly.manifest.json --out architecture-summary.md` and commit that file.
5. Verify summary: exit 0, output contains chassis module names `resilience`, `platform`, `context`, `ideation`, `provenance`.
6. Append operator-added section to disclosure.md (after generated content, separated by `---`):
   ## Operator disclosure (added manually, not generated)
   - Pre-built non-AI scaffolding: the five included chassis modules `resilience`, `platform`, `context`, `ideation`, `provenance` — author's own open-source scaffolding, reused and disclosed.
   - Built inside Sep 1-30 window: everything under `engine/`, `src/mockrill/`, `api/`, the prompts, the question bank (`engine/rag/question-bank.json`), the dialogue policy, the scoring rubric (`src/mockrill/scoring/*`).
   - Deliberate technology choices: Path B with browser connecting directly to AssemblyAI streaming (`wss://streaming.assemblyai.com/v3/ws` with short-lived token from `GET /api/aai-token`), AssemblyAI LLM Gateway for orchestration (`POST https://llm-gateway.assemblyai.com/v1/chat/completions` with JSON-Schema tool calling, model `claude-sonnet-4-6` fallback `qwen3.5-4b-32k-fast`), and browser `speechSynthesis` for voice output instead of a TTS vendor (no second key, no second API).
   - Rule Book's explicit scaffold-disclosure clause was `[unconfirmed]` at kickoff and disclosing regardless is the safe choice.
7. Re-verify disclosure.md contains all four bullet strings above verbatim after append.
8. If winning_project_plan.md or assembly.manifest.json changes, re-run generate then summary (hard order; see A8).
```
Both are pure functions, exit 0 on success — state verbatim.

### A4 M45 diagrams algorithm (WU-SUB-04)

```
1. Create docs/ directory if not exists.
2. Write docs/architecture.mmd with the Mermaid literal from §3 M45 (must contain all required node label strings; use flowchart LR).
3. Render PNG:
   npx -y @mermaid-js/mermaid-cli@10 mmdc -i docs/architecture.mmd -o docs/architecture.png -b white --width 1600
   Must exit 0; verify `docs/architecture.png` exists and `wc -c docs/architecture.png` > 0.
   Alternative: if mmdc not available, `npx mmdc` or manual export via mermaid.live, but pin to mmdc 10.
4. Generate chassis-modules diagram:
   npx vite-node src/ideation/deckgen/cli.ts diagram --manifest assembly.manifest.json --out docs/chassis-modules.mmd
   Pure function, exit 0; verify file exists and contains `resilience` and `provenance`.
5. Document complementarity: in docs/architecture.mmd header comment and in plan state: "The two diagrams are complementary (one is runtime data flow, one is module provenance)."
6. Reference docs/architecture.png from README.md via `![Architecture](docs/architecture.png)`.
```
S4 mirroring is required — browser box, AssemblyAI boxes, three serverless functions, offline mock path — all present.

### A5 README.md spin-up guide algorithm (WU-SUB-05)

```
1. Write README.md at repo root with exactly these sections in order:
   # Mockrill — Realtime AI Mock-Interview Voice Coach
   One paragraph what/why: junior bootcamp graduates rehearse spoken technical screens; realtime voice agent quotes exact moments (07:42) and re-drills weakest answer by voice; why AI why now: only realtime voice can observe spoken behavior it coaches.
   ## Quickstart (90 seconds)
   ```sh
   npm ci
   cp .env.example .env   # then set ASSEMBLYAI_API_KEY in .env
   npm run dev             # or npm run build && npm run preview
   ```
   Plus: copy .env.example to .env, set ASSEMBLYAI_API_KEY, npm run dev (Vite on https or localhost), open http://localhost:5173.
   ## Hosted URL
   `https://<app>.vercel.app` (the PUBLIC_URL; DP-DEPLOY). If not yet deployed, placeholder `https://mockrill.vercel.app` with note "deployed URL after npm run deploy".
   ## Architecture
   ![Architecture](docs/architecture.png)  + one sentence referencing docs/chassis-modules.mmd for module provenance.
   ## Offline demo (no key)
   ```sh
   npm run build
   npm run preview -- --port 4173 &  # or npm run preview
   npm run mock:publish              # vite-node scripts/mockrill-mock-publish.ts SSE :8787/events/stream
   # open http://localhost:4173?source=stream
   ```
   ## AssemblyAI features used (Application-of-Technology evidence)
   - Streaming STT: `speech_model: universal-3-5-pro`, `sample_rate: 16000`, `encoding: pcm_s16le`, `format_turns: false→true`, `end_of_turn_confidence_threshold: 0.4`, `min_turn_silence`, `max_turn_silence: 1536`, `vad_threshold: 0.2`, `interruption_delay`, `mode: balanced`, `keyterms_prompt`
   - Token: `GET https://streaming.assemblyai.com/v3/token` with `Authorization: <ASSEMBLYAI_API_KEY>` and `expires_in_seconds`
   - LLM Gateway: `POST https://llm-gateway.assemblyai.com/v1/chat/completions` with `model: claude-sonnet-4-6` fallback `qwen3.5-4b-32k-fast`, `tools` JSON-Schema, `tool_choice`
   - Voice output: `window.speechSynthesis` (no TTS vendor)
   ## License
   MIT — see LICENSE (2026 Mockrill Contributors)
   ## Disclosure
   See disclosure.md (generated via provo) and architecture-summary.md
2. Verify README.md contains strings: `npm ci`, `ASSEMBLYAI_API_KEY`, `npm run dev`, `docs/architecture.png`, `npm run preview`, `npm run mock:publish`, `universal-3-5-pro`, `speechSynthesis`, `MIT`, `disclosure.md`.
3. Verify README.md does NOT contain a real key pattern: `grep -E "sk-[A-Za-z0-9]{20,}" README.md` must exit 1 (no match); `grep -E "ASSEMBLYAI_API_KEY=[^\n]+[A-Za-z0-9]{10,}" README.md` must not match a real key (only placeholder).
```
Must not contain a key, token, or personal transcript — state verbatim.

### A6 submission.md generation algorithm (WU-SUB-06, M46)

```
1. Prereqs: winning_project_plan.md, assembly.manifest.json, disclosure.md (after A3) all exist.
2. Run:
   npx vite-node src/provenance/submit/cli.ts format --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out submission.md
   Pure function, exit 0, writes submission.md at repo root.
3. Verify submission.md first line contains `Submission` or `# Submission`.
4. Hand-tighten (manual edits after generation, committed): ensure each of the 10 fields matches binding format from §3 M46:
   1 title = Mockrill — Realtime AI Mock-Interview Voice Coach
   2 short description ≤280 chars
   3 long description 3-5 paragraphs
   4 tags = AssemblyAI, Universal-3.5-Pro, Realtime STT, LLM Gateway, Voice Agent, Interview Prep (exact 6)
   5 cover PNG/JPG 16:9 — note DP-PITCH produces assets/cover-16x9.png; acceptance: file exists, 16:9, png/jpg
   6 video MP4 3-5 min — DP-PITCH produces assets/demo-3-5min.mp4; acceptance: mp4, 180-300s
   7 slides PDF — DP-PITCH produces assets/slides.pdf; acceptance: pdf exists
   8 public GitHub repo URL — acceptance: URL reachable, repo public, no private/ shipped (A1)
   9 hosting platform = Vercel — DP-DEPLOY produces vercel.json + api/health.ts; acceptance: vercel.json present
   10 Application URL = https://<app>.vercel.app — DP-DEPLOY produces PUBLIC_URL; acceptance: GET /health 200
   For 5-7 producing plan DP-PITCH; for 9-10 DP-DEPLOY — stated in submission.md as comments.
5. Re-verify submission.md contains all 10 field headings (grep each).
```

### A7 Hygiene gate algorithm (WU-SUB-07)

```
1. Run:
   npx vite-node src/provenance/submit/cli.ts hygiene --manifest assembly.manifest.json --out hygiene-report
   Exit-code contract: exit 1 on explicit `flagged` verdict, exit 0 on pass; outputs still written on flagged; flagged blocks submission until resolved.
2. Check output: `cat hygiene-report` or `cat hygiene-report/verdict.txt` (depending on CLI out shape) must contain `verdict: pass` (or `hygiene: pass` if CLI uses that). Plan fixes to `verdict: pass`.
3. If flagged: read hygiene-report flagged reasons (e.g. private/ leaked, .env tracked, LICENSE missing, submission.md field missing, key leaked in README), fix per A1/A2/A5/A6, then re-run hygiene until pass.
4. Verify green: `echo $?` after hygiene must be 0; hygiene-report contains `verdict: pass`.
```
Outputs are still written on flagged — state verbatim.

### A8 Regeneration order hard rule (WU-SUB-08, docs/repackage.md)

After ANY change to winning_project_plan.md, assembly.manifest.json, or deployed URL, re-run in this exact order (state as hard rule):
```
1. npx vite-node src/provenance/provo/cli.ts generate --manifest assembly.manifest.json --out disclosure.md [--ai-log ...]
2. npx vite-node src/provenance/provo/cli.ts summary --manifest assembly.manifest.json [--out architecture-summary.md]
3. npx vite-node src/ideation/deckgen/cli.ts populate --manifest assembly.manifest.json  (or deckgen population step if defined by DP-PITCH)
4. npx vite-node src/ideation/script/cli.ts generate --manifest assembly.manifest.json
5. npx vite-node src/ideation/faqdef/cli.ts generate --manifest assembly.manifest.json
6. npx vite-node src/provenance/submit/cli.ts format --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out submission.md
7. npx vite-node src/provenance/submit/cli.ts hygiene --manifest assembly.manifest.json --out hygiene-report
```
They are pure functions; running them out of order produces a submission.md that disagrees with disclosure.md — state verbatim. Write this runbook committed as docs/repackage.md (created by WU-SUB-08) with copy-pasteable commands and the sentence: "Step 1 must be provo generate; skipping or reordering produces a flagged hygiene."
```

## §6 Configuration, environment & files

### Env vars

| Name | Who reads it | Default | What happens when missing |
|---|---|---|---|
| `ASSEMBLYAI_API_KEY` | `api/aai-token.ts`, `api/turn.ts` (server-only) — NOT read by DP-SUBMIT | (no default — required for live) | `GET /api/aai-token` returns 503 degraded; hygiene flags if key leaked into README/submission; DP-SUBMIT never reads it |
| `MOCKRILL_LLM_MODEL` | `api/turn.ts` | `claude-sonnet-4-6` | Falls back to primary model |
| `MOCKRILL_LLM_FALLBACK_MODEL` | `api/turn.ts` | `qwen3.5-4b-32k-fast` | Falls back to fallback model |
| `PUBLIC_URL` | `vercel.json` deploy + `submission.md` field 10 + `README.md` hosted URL | `https://<app>.vercel.app` after deploy; placeholder before | README shows placeholder; submission field 10 empty until DP-DEPLOY sets it |
| `RES_FORCED_DEGRADED` | `src/resilience` kill switch | unset (live) | Live behavior; set `1` only for offline demo via mock:publish |
| No new env vars owned by DP-SUBMIT | — | — | DP-SUBMIT reads no secret; `ASSEMBLYAI_API_KEY` must never reach browser bundle |

All env reads are server side in `api/*.ts` (DP-AAI-STREAM / DP-INTERVIEWER / DP-DEPLOY). DP-SUBMIT owns no `ASSEMBLYAI_API_KEY` read.

### Config files

- `.gitignore` at repo root — edited by this plan to add `private/` (chassis already covers `.env`, `*.key`, `credentials*.json`, `.cache/`). No other DP edits `private/`.
- `assembly.manifest.json` — chassis read-only; includes `resilience,platform,context,ideation,provenance`; excludes `media,dev-tooling,...`; never edited by this plan.
- `winning_project_plan.md` — read-only input to provo + submit; never edited by this plan except via regeneration order note.
- `src/provenance/provo/cli.ts` and `src/provenance/submit/cli.ts` — chassis read-only CLIs; invoked via `npx vite-node`, never imported.
- `src/ideation/deckgen/cli.ts` — chassis read-only; invoked for `diagram`.
- `LICENSE` — owned by this plan (WU-SUB-02).
- `disclosure.md`, `architecture-summary.md` — generated by this plan (WU-SUB-03).
- `docs/architecture.mmd` / `docs/architecture.png` / `docs/chassis-modules.mmd` — owned by this plan (WU-SUB-04, M45).
- `README.md` — owned by this plan (WU-SUB-05).
- `submission.md` — owned by this plan (WU-SUB-06, M46).
- `hygiene-report` — output of hygiene CLI (WU-SUB-07).
- `docs/repackage.md` — regeneration runbook (WU-SUB-08).

### Complete file map — everything this plan creates or edits

| Path | Action | Description |
|---|---|---|
| `.gitignore` | **EDIT** (append `private/`) | Hygiene first; private/design_documents never ships |
| `LICENSE` | **CREATE** | MIT 2026 Mockrill Contributors |
| `disclosure.md` | **CREATE** (generated) | `provo generate` output + operator-added section |
| `architecture-summary.md` | **CREATE** (generated) | `provo summary` output |
| `docs/architecture.mmd` | **CREATE** | Mermaid runtime data-flow (M45) |
| `docs/architecture.png` | **CREATE** | Rendered PNG from mmdc |
| `docs/chassis-modules.mmd` | **CREATE** (generated) | `deckgen diagram` output (module provenance) |
| `README.md` | **CREATE** (or EDIT if exists) | Spin-up guide |
| `submission.md` | **CREATE** (generated then hand-tightened) | 10 fields (M46) |
| `hygiene-report` | **CREATE** (CLI output) | Hygiene verdict |
| `docs/repackage.md` | **CREATE** | Regeneration-order runbook |
| `private/design_documents/design_plans/DP-SUBMIT.md` | **CREATE** | This plan |

No other path. Chassis files `src/resilience/*`, `src/platform/*`, `src/context/*`, `src/ideation/*`, `src/provenance/*`, `contracts/*`, `assembly.manifest.json` are explicitly NOT edited. `config/deploy/vercel.json`, `api/*.ts` are NOT edited (owned by DP-DEPLOY/DP-AAI-STREAM).

## §7 Failure & degradation behavior

| # | Failure | Detection | DegradedResult / exit-code reason | What the user sees | Fallback-ladder rung |
|---|---|---|---|---|---|
| F-SUB-01 | `private/` not in `.gitignore`; `private/design_documents/master_blueprint_entry.md` would ship to public repo | `git check-ignore -v private/design_documents/master_blueprint_entry.md` prints nothing (not ignored) | Not a DegradedResult — hygiene `flagged` (`private_leak` or `unignored_private`) | Submission blocked; hygiene fails; fix: add `private/` line | Rung — docs/hygiene gate (not runtime) |
| F-SUB-02 | `.env` tracked despite `.gitignore` (`git ls-files` contains `.env`) | `git ls-files | grep -c '^\.env$'` prints `1` | hygiene `flagged` (`secret_tracked` / `env_tracked`) | Secret would leak to public repo; fix `git rm --cached .env` | Rung — hygiene gate |
| F-SUB-03 | `LICENSE` missing or year≠2026 or MIT body missing | `cat LICENSE | grep "2026"` fails or `grep "Permission is hereby granted"` fails | hygiene `flagged` (`license_missing` / `license_year`) | Submission fails MIT-compliant check; judges score zero; fix WU-SUB-02 | Rung — hygiene gate |
| F-SUB-04 | `provo generate` fails (missing manifest/plan, parse error) | CLI exit non-zero | Not DegradedResult — CLI exits 1, `disclosure.md` not written | Console error from provo; fix manifest/plan JSON/markdown | N/A — pure function |
| F-SUB-05 | `disclosure.md` stale after change to `winning_project_plan.md` or `assembly.manifest.json` | `submit hygiene` detects hash mismatch or timestamp older than inputs | hygiene `flagged` (`disclosure_stale`) | `submission.md` disagrees with disclosure; fix: re-run A8 order from `provo generate` | N/A — regeneration order |
| F-SUB-06 | `docs/architecture.mmd` missing required node label (e.g. no `wss://streaming.assemblyai.com/v3/ws`) | Manual grep check; hygiene may flag `architecture_incomplete` | hygiene `flagged` if implemented | Architecture diagram incomplete; fix A4 | N/A |
| F-SUB-07 | `docs/architecture.png` not rendered (missing mmdc, PNG 0 bytes) | `ls docs/architecture.png` missing or `wc -c` =0; `npx mmdc` exit non-zero | Not DegradedResult | README image broken; fix render command | N/A |
| F-SUB-08 | `README.md` contains a real key pattern `sk-...` or `ASSEMBLYAI_API_KEY=...` with entropy | `grep -E "sk-[A-Za-z0-9]{20,}" README.md` matches | hygiene `flagged` (`secret_leaked`) | Key leaked to public repo / submission; blocked | Rung — hygiene gate |
| F-SUB-09 | `README.md` missing required section (e.g. no `npm ci`, no `ASSEMBLYAI_API_KEY`, no `docs/architecture.png`) | `grep -c "npm ci" README.md` =0 | hygiene `flagged` (`readme_incomplete`) | Judges cannot spin up; fix WU-SUB-05 | N/A |
| F-SUB-10 | `submission.md` field missing (e.g. field 10 Application URL empty) | `submit hygiene` checks 10 fields present | hygiene `flagged` (`submission_field_missing`) | Submission gate fails lablab; fix WU-SUB-06 | N/A |
| F-SUB-11 | `submit hygiene` verdict `flagged` (any reason) | CLI exit 1 and output contains `verdict: flagged` | Exit 1 is contract; outputs still written — state verbatim | Submission blocked until resolved; read hygiene-report and fix per runbook | Rung — hygiene gate (blocks submission) |
| F-SUB-12 | Regeneration out of order (e.g. `submit format` before `provo generate`) | Next `submit hygiene` flags `disclosure_stale` or manual hash compare | hygiene `flagged` | `submission.md` disagrees with `disclosure.md`; fix: re-run A8 exact order | N/A |

Invariant: DP-SUBMIT owns no `withResilience` call; all failures are hygiene `flagged` verdicts or CLI non-zero exits, not runtime DegradedResult. Runtime DegradedResult reasons (`cache`, `none`, `secondary_provider`) are owned by DP-INTERVIEWER/DP-AAI-STREAM and only referenced in docs.

## §8 Public surface & import rules

### What is exported (public surface)

- `LICENSE` at repo root — MIT license text (no import; file reference).
- `disclosure.md` at repo root — generated disclosure; DP-PITCH consumes it.
- `architecture-summary.md` at repo root — summary; judges / README reference.
- `docs/architecture.mmd` / `docs/architecture.png` (M45) — diagrams; README embeds PNG.
- `docs/chassis-modules.mmd` — module provenance diagram; README references.
- `README.md` at repo root — spin-up guide; judges / hygiene read it.
- `submission.md` at repo root (M46) — 10 fields; lablab submission copies it.
- `docs/repackage.md` — regeneration runbook; all DPs reference it.
- `hygiene-report` — hygiene verdict output.

There is no TS barrel for DP-SUBMIT; owned artifacts are markdown/PNG/config, not TS exports.

### What is internal

- `.gitignore` edit (single line `private/`) — not an export, but owned edit.
- `private/design_documents/design_plans/DP-SUBMIT.md` — this plan (internal docs, git-ignored after WU-SUB-01 — correctly not shipped).
- CLIs invoked (`provo`, `submit`, `deckgen diagram`) — not wrapped or re-exported.

### Import rules (binding)

1. DP-SUBMIT MUST NOT import or edit anything under `src/resilience/`, `src/platform/`, `src/context/`, `src/ideation/`, `src/provenance/`, `contracts/`, `assembly.manifest.json` — chassis read-only.
2. DP-SUBMIT MUST NOT create, edit, or delete `src/media`, `src/cost`, `src/dev`, `src/pgm`, `src/profile`, `src/assembly` — excluded and absent.
3. DP-SUBMIT MUST NOT import CLIs as TS modules; invoke only via `npx vite-node <path> <command> --manifest ...`.
4. `ASSEMBLYAI_API_KEY` MUST be read only in `api/*.ts` (DP-AAI-STREAM / DP-INTERVIEWER); DP-SUBMIT reads no secret and README/submission must not contain a key/token.
5. `.gitignore` is edited only to add `private/`; no other DP touches that line. `LICENSE` is owned only by DP-SUBMIT.
6. `disclosure.md` is generated, never hand-written; operator-added section is appended after generation. Re-defining disclosure elsewhere is a defect.
7. Deep imports are irrelevant (no TS exports), but any future TS helper in `scripts/` must use barrel path `src/resilience` if it wraps resilience — not applicable to DP-SUBMIT which owns no resilience wrapper.

## §9 Work units

### WU-SUB-01 — `.gitignore` `private/` + secret audit (FIRST)

- **Goal:** Ensure `private/design_documents/` and every design plan never ship in the public repo required by submission field 8; confirm `.env`, `*.key`, `credentials*.json`, `.cache/` already covered and no `.env` tracked.
- **Depends on:** none — must be FIRST work unit before any other file is added.
- **Files touched:** `.gitignore` (EDIT — append one line `private/`)
- **Implementation steps:**
  1. Read `.gitignore` as utf8; print existing lines containing `.env`, `*.key`, `credentials`, `.cache` to confirm coverage.
  2. If no line matches `/^private\/$/m`, append `private/` with trailing `\n` (ensure file ends with `\n` before appending; use bare `private/` not `private/**` or `/private/`).
  3. State reason in plan and in commit message: *The design blueprint and every design plan live under `private/design_documents/` and `.gitignore` does NOT currently cover it — without this line the entry's internal strategy documents ship in the public repo required by submission field 8.*
  4. Confirm `.env`, `*.key`, `credentials*.json`, `.cache/` already covered by existing `.gitignore` (they are; do not add project-specific patterns beyond `private/`).
  5. Run `git ls-files | grep -c '^\.env$'` and assert `0`; if non-zero, `git rm --cached .env`.
  6. Run `git check-ignore -v private/design_documents/master_blueprint_entry.md` and assert it prints a line containing `private/`.
- **Verification command (ONE runnable line — two checks in sequence):**
  ```sh
  git check-ignore -v private/design_documents/master_blueprint_entry.md && echo "---" && git ls-files | grep -c '^\.env$'
  ```
- **Expected output (exact):**
  ```
  .gitignore:<line-number>:private/\tprivate/design_documents/master_blueprint_entry.md
  ---
  0
  ```
  First line must contain `.gitignore:` and `private/` and the path; second line after `---` is literal `0`. Exit code 0. `<line-number>` is whichever line `private/` was added on.
- **Done-when:** `.gitignore` contains bare `private/`, `git check-ignore` prints matching rule, `git ls-files | grep -c '^\.env$'` prints `0`, and reason sentence appears in plan.

### WU-SUB-02 — MIT `LICENSE` (2026 Mockrill Contributors)

- **Goal:** Create the MIT license required for *original and MIT-compliant* submission; year+holder are the only variable parts.
- **Depends on:** WU-SUB-01 (so LICENSE ships in public repo; private/ does not).
- **Files touched:** `LICENSE` (CREATE at repo root)
- **Implementation steps:**
  1. Write `LICENSE` at repo root with exact text from §5 A2 (header `MIT License`, copyright line `Copyright (c) 2026 Mockrill Contributors`, body `Permission is hereby granted, free of charge...` verbatim).
  2. Ensure year is `2026` and holder is `Mockrill Contributors` (the only variable parts).
  3. Ensure file ends with newline.
  4. Do not add any other license file.
- **Verification command (ONE runnable line):**
  ```sh
  head -n1 LICENSE && grep -c "2026" LICENSE && grep -c "Mockrill Contributors" LICENSE && grep -c "Permission is hereby granted" LICENSE
  ```
- **Expected output (exact, four lines):**
  ```
  MIT License
  1
  1
  1
  ```
  First line is `MIT License`; next three lines are `1` each. Exit 0.
- **Done-when:** `LICENSE` exists at repo root, first line is `MIT License`, contains `2026` and `Mockrill Contributors` and MIT body, and plan states year+holder are the only variable parts.

### WU-SUB-03 — `provo generate` + `summary` + the added disclosure section

- **Goal:** Generate `disclosure.md` and `architecture-summary.md` as pure functions from `assembly.manifest.json`; include honest `--ai-log` tool:scope pairs and the operator-added section (scaffolding vs Sep window, Path B / Gateway / speechSynthesis, `[unconfirmed]` clause).
- **Depends on:** WU-SUB-01, WU-SUB-02 (so disclosure can reference license).
- **Files touched:** `disclosure.md` (CREATE, generated + appended), `architecture-summary.md` (CREATE, generated)
- **Implementation steps:**
  1. Run `npx vite-node src/provenance/provo/cli.ts generate --manifest assembly.manifest.json --out disclosure.md --ai-log "cursor:code-generation" --ai-log "vite-node:cli-execution" --ai-log "assemblyai:stt-llm-tts"` — must exit 0; verify `disclosure.md` exists and first line contains `Disclosure` or `Provenance`.
  2. Run `npx vite-node src/provenance/provo/cli.ts summary --manifest assembly.manifest.json` (and if CLI supports `--out`, also `npx vite-node src/provenance/provo/cli.ts summary --manifest assembly.manifest.json --out architecture-summary.md` and commit that file) — must exit 0; output contains `resilience`, `platform`, `context`, `ideation`, `provenance`.
  3. Append operator-added section to `disclosure.md` after generated content, separated by `---`, with the four bullets from §5 A3 (pre-built scaffolding list, Sep 1-30 list, Path B / Gateway / speechSynthesis choices, `[unconfirmed]` safe-choice sentence) verbatim.
  4. Re-verify disclosure.md contains strings: `pre-built non-AI scaffolding`, `Sep 1-30`, `Path B`, `LLM Gateway`, `speechSynthesis`, `\[unconfirmed\]`.
  5. Document in plan: both are pure functions, exit 0 on success, must be regenerated after ANY change to `winning_project_plan.md` or `assembly.manifest.json`.
- **Verification command (ONE runnable line):**
  ```sh
  npx vite-node src/provenance/provo/cli.ts generate --manifest assembly.manifest.json --out disclosure.md --ai-log "cursor:code-generation" --ai-log "vite-node:cli-execution" --ai-log "assemblyai:stt-llm-tts" && echo "generate exit:$?" && head -n1 disclosure.md && npx vite-node src/provenance/provo/cli.ts summary --manifest assembly.manifest.json && echo "summary exit:$?"
  ```
- **Expected output (exact substrings, exit 0):**
  ```
  generate exit:0
  # Disclosure
  summary exit:0
  ```
  (First line of disclosure.md is `# Disclosure` or similar containing `Disclosure`; the two `exit:0` lines are literal.) Must exit 0 overall. If CLI output differs slightly, at least `generate exit:0` and `summary exit:0` and `Disclosure` must appear.
- **Done-when:** Both CLIs exit 0, `disclosure.md` contains generated header plus four operator bullets with `[unconfirmed]`, `architecture-summary.md` or stdout contains module names, and three `--ai-log` pairs documented.

### WU-SUB-04 — `docs/architecture.mmd` + PNG + the chassis-module diagram (M45)

- **Goal:** Create Mermaid runtime data-flow diagram mirroring S4 and render to PNG; also generate module-composition diagram via `deckgen diagram`; note they are complementary.
- **Depends on:** WU-SUB-03 (so summary exists; but can run parallel).
- **Files touched:** `docs/architecture.mmd` (CREATE), `docs/architecture.png` (CREATE), `docs/chassis-modules.mmd` (CREATE via deckgen)
- **Implementation steps:**
  1. Create `docs/` if not exists.
  2. Write `docs/architecture.mmd` with the exact Mermaid literal from §3 M45 (must contain all required node labels: `mic`, `StreamingClient`, `TurnController`, `speechSynthesis`, `MockrillEventBus`, `useMockrillEvents`, `wss://streaming.assemblyai.com/v3/ws`, `GET https://streaming.assemblyai.com/v3/token`, `POST https://llm-gateway.assemblyai.com/v1/chat/completions`, `GET /api/aai-token`, `POST /api/turn`, `GET /api/health`, `scripts/mockrill-mock-publish.ts`, `fixtures/mockrill/session-golden.json`).
  3. Render: `npx -y @mermaid-js/mermaid-cli@10 mmdc -i docs/architecture.mmd -o docs/architecture.png -b white --width 1600` — must exit 0; verify PNG `wc -c` >0.
  4. Generate provenance diagram: `npx vite-node src/ideation/deckgen/cli.ts diagram --manifest assembly.manifest.json --out docs/chassis-modules.mmd` — must exit 0; verify contains `resilience` and `provenance`.
  5. Add comment in both mmd files: `%% The two diagrams are complementary (one is runtime data flow, one is module provenance).`
- **Verification command (ONE runnable line):**
  ```sh
  npx vite-node src/ideation/deckgen/cli.ts diagram --manifest assembly.manifest.json --out docs/chassis-modules.mmd && echo "diagram exit:$?" && head -n1 docs/chassis-modules.mmd && ls docs/architecture.png && grep -c "wss://streaming.assemblyai.com/v3/ws" docs/architecture.mmd
  ```
- **Expected output (exact substrings):**
  ```
  diagram exit:0
  flowchart
  docs/architecture.png
  1
  ```
  (First line of chassis-modules.mmd is `flowchart` etc.; PNG listed; grep count `1` for WS URL.) Exit 0. If mmdc step not included in this one-liner, PNG check still passes if previously rendered.
- **Done-when:** Both `.mmd` files exist with required labels, PNG exists >0 bytes, deckgen diagram exited 0, complementarity sentence appears in plan.

### WU-SUB-05 — `README.md` spin-up guide

- **Goal:** Judge-facing clone-and-run guide with 90-sec quickstart, hosted URL, architecture diagram, offline demo, AssemblyAI features with exact parameter names, license line, pointer to `disclosure.md`; no key/token/transcript.
- **Depends on:** WU-SUB-02 (LICENSE line), WU-SUB-04 (diagram PNG path).
- **Files touched:** `README.md` (CREATE at repo root)
- **Implementation steps:**
  1. Write `README.md` per §5 A5 literal: one-paragraph what/why, Quickstart `npm ci` + `cp .env.example .env` + `ASSEMBLYAI_API_KEY` + `npm run dev`, Hosted URL `https://<app>.vercel.app`, Architecture `![Architecture](docs/architecture.png)`, Offline demo `npm run preview` + `npm run mock:publish`, AssemblyAI features with exact param names (`speech_model: universal-3-5-pro`, `sample_rate: 16000`, `encoding: pcm_s16le`, `format_turns`, `end_of_turn_confidence_threshold: 0.4`, `vad_threshold: 0.2`, `llm-gateway model: claude-sonnet-4-6` fallback `qwen3.5-4b-32k-fast`, `speechSynthesis`), License `MIT — see LICENSE`, Disclosure `See disclosure.md`.
  2. Verify contains all required strings: `npm ci`, `ASSEMBLYAI_API_KEY`, `npm run dev`, `docs/architecture.png`, `npm run preview`, `npm run mock:publish`, `universal-3-5-pro`, `speechSynthesis`, `MIT`, `disclosure.md`.
  3. Verify does NOT contain a real key: `grep -E "sk-[A-Za-z0-9]{20,}" README.md` must exit 1.
  4. State: README must not contain a key, token, or personal transcript.
- **Verification command (ONE runnable line):**
  ```sh
  grep -c "npm ci" README.md && grep -c "ASSEMBLYAI_API_KEY" README.md && grep -c "docs/architecture.png" README.md && grep -c "speechSynthesis" README.md && grep -c "disclosure.md" README.md
  ```
- **Expected output (exact, four or five lines each `1` or greater):**
  ```
  1
  1
  1
  1
  1
  ```
  Five lines each `1` (or at least `1`). Exit 0. If one grep fails (exit 1), WU not done.
- **Done-when:** `README.md` exists with all required sections/strings, no key pattern, all greps print `1`.

### WU-SUB-06 — `submit format` → `submission.md` (M46), all 10 fields filled

- **Goal:** Generate `submission.md` via `submit format` then hand-tighten to fill all 10 fields with binding format; note producing plan for fields 5-7 (DP-PITCH) and 9-10 (DP-DEPLOY).
- **Depends on:** WU-SUB-03 (disclosure needed), WU-SUB-05 (README context), assembly.manifest.json + winning_project_plan.md present.
- **Files touched:** `submission.md` (CREATE at repo root)
- **Implementation steps:**
  1. Run `npx vite-node src/provenance/submit/cli.ts format --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out submission.md` — must exit 0; verify first line contains `Submission`.
  2. Hand-tighten (edit file) to ensure 10 fields match §3 M46 literal: title, short description, long description, tags (exact 6: `AssemblyAI`, `Universal-3.5-Pro`, `Realtime STT`, `LLM Gateway`, `Voice Agent`, `Interview Prep`), cover PNG/JPG 16:9, video MP4 3-5 min, slides PDF, public GitHub repo URL, hosting platform `Vercel`, Application URL `https://<app>.vercel.app`. Add comments `<!-- DP-PITCH: fields 5-7 -->` and `<!-- DP-DEPLOY: fields 9-10 -->`.
  3. For each field name the producing plan and acceptance check per §2 R-SUB-07 (list in plan and optionally as comments in submission.md).
  4. Re-verify `grep -c "## 1\." submission.md` etc. for all 10.
- **Verification command (ONE runnable line):**
  ```sh
  npx vite-node src/provenance/submit/cli.ts format --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out submission.md && echo "format exit:$?" && head -n1 submission.md && grep -c "AssemblyAI" submission.md
  ```
- **Expected output (exact substrings):**
  ```
  format exit:0
  # Submission
  1
  ```
  First line of submission.md contains `# Submission`; grep count at least `1` for `AssemblyAI`. Exit 0.
- **Done-when:** `submit format` exits 0, `submission.md` exists with all 10 fields, tags contain exactly 6 required strings, producing plans noted.

### WU-SUB-07 — `submit hygiene` green, with the exact expected verdict line

- **Goal:** Hygiene gate passes with explicit green verdict; exit-code contract honored (exit 1 on flagged, outputs still written; flagged blocks submission).
- **Depends on:** WU-SUB-01..06 all green (any flagged field will cause fail).
- **Files touched:** `hygiene-report` (CREATE — CLI output dir/file)
- **Implementation steps:**
  1. Run `npx vite-node src/provenance/submit/cli.ts hygiene --manifest assembly.manifest.json --out hygiene-report`.
  2. Note exit-code contract: exit 1 on explicit `flagged` verdict, exit 0 on pass; outputs still written on flagged — state verbatim.
  3. If flagged, read hygiene-report, fix per F-SUB table (e.g. add private/, LICENSE, README key leak, disclosure stale, submission field missing), then re-run until pass.
  4. Verify `cat hygiene-report` (or `hygiene-report/verdict.txt`) contains `verdict: pass` (or `hygiene: pass`) and exit code is 0.
- **Verification command (ONE runnable line):**
  ```sh
  npx vite-node src/provenance/submit/cli.ts hygiene --manifest assembly.manifest.json --out hygiene-report; echo "hygiene exit:$?"; cat hygiene-report 2>/dev/null | head -n5; cat hygiene-report/verdict.txt 2>/dev/null | head -n5
  ```
- **Expected output (exact):**
  ```
  hygiene exit:0
  verdict: pass
  ```
  Must contain `hygiene exit:0` and `verdict: pass` (or `hygiene: pass`) in following lines. Exit 0 overall. If flagged, exit will be `hygiene exit:1` and `verdict: flagged` — not done.
- **Done-when:** Hygiene CLI exits 0, report contains `verdict: pass`, flagged blocks submission rule documented.

### WU-SUB-08 — the regeneration-order runbook committed as `docs/repackage.md`

- **Goal:** Commit the hard regeneration order as a copy-pasteable runbook so any change to `winning_project_plan.md`, `assembly.manifest.json`, or deployed URL yields consistent `disclosure.md`/`submission.md`.
- **Depends on:** WU-SUB-03..07 (runbook references all CLIs).
- **Files touched:** `docs/repackage.md` (CREATE)
- **Implementation steps:**
  1. Write `docs/repackage.md` with exact content:
     ```md
     # Repackage runbook — regeneration order (hard rule)
     After ANY change to `winning_project_plan.md`, `assembly.manifest.json`, or the deployed `PUBLIC_URL`, re-run in this exact order:
     ```sh
     npx vite-node src/provenance/provo/cli.ts generate --manifest assembly.manifest.json --out disclosure.md --ai-log "cursor:code-generation" --ai-log "vite-node:cli-execution" --ai-log "assemblyai:stt-llm-tts"
     npx vite-node src/provenance/provo/cli.ts summary --manifest assembly.manifest.json --out architecture-summary.md
     npx vite-node src/ideation/deckgen/cli.ts populate --manifest assembly.manifest.json
     npx vite-node src/ideation/script/cli.ts generate --manifest assembly.manifest.json
     npx vite-node src/ideation/faqdef/cli.ts generate --manifest assembly.manifest.json
     npx vite-node src/provenance/submit/cli.ts format --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out submission.md
     npx vite-node src/provenance/submit/cli.ts hygiene --manifest assembly.manifest.json --out hygiene-report
     ```
     They are pure functions; running them out of order produces a `submission.md` that disagrees with `disclosure.md`.
     Step 1 must be provo generate; skipping or reordering produces a flagged hygiene.
     ```
  2. Ensure file is committed (git-add) so it ships? Note it lives under `docs/` not `private/`, so it does ship.
  3. State deadline discipline reference: official Wed 2026-09-30 15:00 UTC; internal Wed 2026-09-24 15:00 UTC; manual submission ≤6h post-deadline with prior organizer approval — never plan around it.
- **Verification command (ONE runnable line):**
  ```sh
  cat docs/repackage.md | head -n5 && grep -c "provo generate" docs/repackage.md && grep -c "submit hygiene" docs/repackage.md
  ```
- **Expected output (exact):**
  ```
  # Repackage runbook — regeneration order (hard rule)
  1
  1
  ```
  First line is `# Repackage...`; grep counts are `1` each. Exit 0.
- **Done-when:** `docs/repackage.md` exists, contains 7 commands in exact order with hard-rule sentence, and verification prints header + counts.


## §10 Acceptance criteria

| # | Requirement | Satisfied by | Check |
|---|---|---|---|
| R-SUB-01 | `.gitignore` `private/` + secret audit first | WU-SUB-01 | `git check-ignore -v private/design_documents/master_blueprint_entry.md` prints `.gitignore:<n>:private/...` and `git ls-files | grep -c '^\.env$'` → `0` |
| R-SUB-02 | MIT `LICENSE` 2026 | WU-SUB-02 | `head -n1 LICENSE` = `MIT License`; `grep -c "2026"` =1; `grep -c "Mockrill Contributors"` =1 |
| R-SUB-03 | `provo generate` + `summary` pure functions, regenerated after plan/manifest change | WU-SUB-03 | `provo generate` exit 0, `disclosure.md` head `Disclosure`, `provo summary` exit 0 |
| R-SUB-04 | Operator-added disclosure section (scaffolding vs Sep window, Path B/Gateway/speechSynthesis, `[unconfirmed]`) | WU-SUB-03 | `grep -c "\[unconfirmed\]" disclosure.md` =1; contains `Path B`, `LLM Gateway`, `speechSynthesis` |
| R-SUB-05 | M45 `docs/architecture.mmd` → PNG + `docs/chassis-modules.mmd` complementary | WU-SUB-04 | `ls docs/architecture.png` exists, `wc -c` >0; `deckgen diagram` exit 0; complementarity sentence present |
| R-SUB-06 | `README.md` spin-up guide (quickstart, URL, diagram, offline, AssemblyAI params, license, disclosure pointer, no key) | WU-SUB-05 | `grep -c "npm ci" README.md` =1; `grep -c "docs/architecture.png"` =1; `grep -E "sk-"` exits 1 |
| R-SUB-07 | M46 `submission.md` 10 fields with binding format, producing plans for 5-7 and 9-10 | WU-SUB-06 | `submit format` exit 0; `head -n1 submission.md` contains `Submission`; `grep -c "AssemblyAI"` ≥1; all 10 headings present |
| R-SUB-08 | Hygiene gate green, exit-code contract | WU-SUB-07 | `submit hygiene` exit 0, report contains `verdict: pass` |
| R-SUB-09 | Regeneration order hard rule committed as `docs/repackage.md` | WU-SUB-08 | `cat docs/repackage.md | head -n1` = `# Repackage runbook...`; 7 commands in order |
| R-SUB-10 | Deadline discipline Sep 30 15:00 UTC / internal Sep 24 15:00 UTC; manual ≤6h with approval — never plan around it | §10 text + WU-SUB-08 runbook note | Plan §10 lists official/internal/manual rule verbatim |
| R-SUB-11 | Every WU has verification command with exact expected output | WU-SUB-01..08 | Each WU section lists ONE runnable line + Expected output |

Deadline discipline (put in §10 as required): **Official Wed 2026-09-30 15:00 UTC; internal target Wed 2026-09-24 15:00 UTC. Manual submission is available only ≤6 h post-deadline with prior organizer approval — never plan around it.**

Hygiene gate note: exit 1 on explicit `flagged` verdict, outputs still written, flagged blocks submission until resolved — verified in WU-SUB-07.

Regeneration order hard rule: `provo generate` → `provo summary` → `deckgen populate` → `script generate` → `faqdef generate` → `submit format` → `submit hygiene` (after ANY change to `winning_project_plan.md`, `assembly.manifest.json`, or deployed URL) — pure functions; out-of-order produces `submission.md` disagreeing with `disclosure.md`.

## §11 Non-goals

- **Not owning chassis code:** Do not create/edit `src/resilience`, `src/platform`, `src/context`, `src/ideation`, `src/provenance`, `contracts`, `assembly.manifest.json` — read-only.
- **Not owning excluded modules:** `src/media` (`withStt`/`withTts`), `src/cost`, `src/dev`, `src/pgm`, `src/profile`, `src/assembly` do not exist and are never imported.
- **Not owning runtime features:** Voice streaming, turn-taking state machine, LLM gateway calls, scoring rubric/fillers/evidence/scorecard — owned by DP-AAI-STREAM / DP-TURNTAKING / DP-INTERVIEWER / DP-SCORECARD; disclosure only documents choices (Path B, Gateway, speechSynthesis) without re-implementing.
- **Not owning UI screens:** Setup/LiveCall/Scorecard/Drill/History, event bus, `useMockrillEvents` — owned by DP-UI; README only references them.
- **Not owning deployment:** `api/health.ts`, `vercel.json`, `PUBLIC_URL`, `npm run deploy` / `deploy:verify` — owned by DP-DEPLOY; SUBMIT only consumes `Vercel` as hosting platform value in submission field 9 and `PUBLIC_URL` in field 10.
- **Not owning pitch production:** Cover 16:9 PNG/JPG, video MP4 3-5 min, slides PDF — owned by DP-PITCH; SUBMIT only formats their pointers in submission fields 5-7 and states acceptance checks.
- **Not adding a second API key, TTS vendor, localStorage-dependent behavior, or server-side audio proxy:** Audio never proxies through serverless; one secret `ASSEMBLYAI_API_KEY` server-only.
- **Not writing a second design plan:** This chat produces exactly one file `private/design_documents/design_plans/DP-SUBMIT.md`; no code files are implemented.

## §12 Open questions

| # | Question blueprint did not settle | Safe default chosen in this plan | Who to confirm with |
|---|---|---|---|
| Q1 | Exact `LICENSE` holder name — brief says MIT-compliant but no holder given | Holder fixed to `Mockrill Contributors` (repo owner name also acceptable); year 2026 is binding | Organizer / repo owner at submit time — update LICENSE holder if needed before public push |
| Q2 | `--ai-log` exact tool:scope pairs required by `provo generate` — list not enumerated in chassis | Required three: `cursor:code-generation`, `vite-node:cli-execution`, `assemblyai:stt-llm-tts`; additional pairs may be appended but disclosure must not be boilerplate | Chassis `src/provenance/provo/cli.ts --help` — add pairs as needed, keep at least 3 |
| Q3 | `provo summary` output path — `--out architecture-summary.md` vs stdout | Plan supports both: run stdout variant always; if `--out` supported, also write `architecture-summary.md` and commit | Chassis provo CLI help — use whichever exits 0 |
| Q4 | Mermaid render toolchain — `mmdc` vs other | Pin to `npx -y @mermaid-js/mermaid-cli@10 mmdc -i docs/architecture.mmd -o docs/architecture.png -b white --width 1600` — if unavailable, alternative manual export acceptable but must still produce PNG >0 |
| Q5 | `docs/chassis-modules.mmd` vs `docs/chassis-modules.mmd` naming — deckgen diagram out name | Fixed to `docs/chassis-modules.mmd` via `deckgen diagram --out docs/chassis-modules.mmd`; if chassis expects different name, adjust but keep complementary note | `deckgen diagram --help` |
| Q6 | `submit hygiene` output shape — `hygiene-report` file vs directory | Plan handles both: `cat hygiene-report 2>/dev/null | head` and `cat hygiene-report/verdict.txt 2>/dev/null`; expected verdict line `verdict: pass` (or `hygiene: pass`) | `submit hygiene --help` — normalize to `verdict: pass` |
| Q7 | `submission.md` field 5-7 assets — Cover/Video/Slides not yet produced when DP-SUBMIT runs | DP-PITCH produces `assets/cover-16x9.png`, `assets/demo-3-5min.mp4`, `assets/slides.pdf`; DP-SUBMIT lists placeholder paths and acceptance checks (16:9, 3-5 min, PDF); hand-tighten after DP-PITCH lands | DP-PITCH owner |
| Q8 | `PUBLIC_URL` not yet deployed when DP-SUBMIT runs | Use placeholder `https://<app>.vercel.app` in README/submission with note "deployed URL after npm run deploy"; regeneration order ensures update after deploy | DP-DEPLOY owner — re-run order after `npm run deploy` puts real URL |
| Q9 | Rule Book scaffold-disclosure clause was `[unconfirmed]` at kickoff | Disclose regardless is safe choice — stated verbatim in disclosure added section | Organizer rule book — keep `[unconfirmed]` note even if later confirmed |
| Q10 | `deckgen populate`, `script generate`, `faqdef generate` exact args — not all enumerated in S6 | Regeneration runbook lists `populate`/`generate` with `--manifest assembly.manifest.json`; if a CLI requires extra flags, add minimal safe defaults inside own namespace and note in docs/repackage.md | Chassis CLIs `--help` |

All defaults are minimal and inside DP-SUBMIT namespace; none modify chassis or excluded modules.

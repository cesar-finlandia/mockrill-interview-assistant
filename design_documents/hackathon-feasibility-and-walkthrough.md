# hackathon-feasibility-and-walkthrough.md — 2026-09 AssemblyAI (canonical: hackathon-projects/2026-09-assemblyAI)

> **Kickoff consistency pass — 2026-09-01 (DEFINITIVE):** migrated from `preparing/2026-09-AssemblyVoice/hackathon-feasibility-and-walkthrough.md` (2026-08-26) to canonical `hackathon-projects/2026-09-assemblyAI/` per Step 4. Kickoff deltas: event-page copy **unchanged** (tagline, Path A/B, prize $10k, schedule Sep 1 15:00 UTC → Sep 30 15:00 UTC, 10 fields, 4 axes); live counters moved 395→**1,374 participants** / ~109→**302 teams** / 0 submissions / Tracks **TBA** (no new tracks); "Registration closes at kickoff" wording on `/live` contradicts intro's "join at any point" — open question for 16:00 UTC Discord Q&A; credit amount + video cap + weights still `[unconfirmed]`. **Deadline confirmed: Wed Sep 30 15:00 UTC (19:00 GST)** — no change. **Paths updated to new canonical brief location:** `hackathon-projects/2026-09-assemblyAI/hackathon_brief.md` and work dir `hackathon-projects/2026-09-assemblyAI/work/` (legacy `hackathon-projects/2026-09-assemblyAI/work/` remains as archive); assembled working copy now `../hackathon-entries/2026-09-assemblyAI` (was `2026-09-AssemblyVoice`). All other dates/commands verified still valid — no other invalidation. Phase −1 checklist items (P0.1–P0.8: install, doctor, env, Reddit cache, Discord login, AAI credits, lablab register, Vercel) should have been completed in August — re-verify `ASSEMBLYAI_API_KEY` and `VERCEL_*` today if not done; mark them done before Hour-0 pipeline. **Feasibility verdict unchanged: GO.**

## Part A — Feasibility verdict (input to the go/no-go decision)

### Verdict: **GOOD FIT — participate.**

This is close to the ideal event for this chassis: it runs on lablab.ai (the exact platform
PROFILE parses, PAS scans and SUBMIT formats for), it mandates exactly the dependency class
the chassis wraps best (a real-time voice API with flaky WebSockets, BYO-LLM routing and TTS),
it allows solo online entries with no mandated end-to-end build platform, and its month-long
window converts TU16's frantic 72-hour pacing into relaxed weekly phases instead of breaking
anything. Judging axes map one-to-one onto what DECKGEN/SCRIPT/FAQDEF/SUBMIT generate. The
only genuine watch-items are competitive density in an open-ended "build a voice agent"
challenge (395 participants already enrolled, teams already forming publicly) and a handful of
unpublished details (video length cap, credit amount, judging weights) that must be re-checked
at kickoff.

### Mandatory-technology analysis

What the event forces, and the module that covers it (catalog row ids from
`contracts/component-catalog.json`):

| Forced by event | Chassis module / files | Catalog citation |
|---|---|---|
| AssemblyAI realtime STT over WebSocket (Path B) / Voice Agent API single connection (Path A) | `src/media` STT wrapper `withStt` (`media/stt` sub-component) | catalog id `media`: "Thin drivers media/stt … with unified MediaMessage (MED-*)"; GOV-MIN-03: include when brief mentions voice |
| Bring-your-own TTS (Path B) | `withTts` (`media/tts`) or direct AAI/OpenAI TTS behind resilience | same `media` row; `ELEVENLABS_API_KEY` only if ElevenLabs chosen |
| WebSocket drops mid-session | `src/resilience` `withResilience` + DegradedResult + golden cache + `RES_FORCED_DEGRADED` kill switch | catalog id `resilience`, requires_env: none |
| Long voice conversations → context overflow | `src/context` buffer | catalog id `context`, requires_env: none |
| BYO LLM routing + agent calls | `src/cost` guardrail around every call | catalog id `cost` (COST-*), reuses CTX-02 counter |
| Live transcript/state UI + required hosted URL | `src/platform` TRN streaming bus + mock envelopes + DEP deploy | catalog id `platform`; env `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` |
| Disclosure + submission copy | `src/provenance` PROVO/SUBMIT | catalog id `provenance` |

**Not covered by the chassis (decision-critical gaps):** the actual *voice loop* itself — mic
capture, audio chunking/streaming to AssemblyAI, barge-in/turn-taking UX on Path B, and voice
playback are product code you build fresh (that is by design: engine, not chassis). The Voice
Agent API path (A) outsources turn-taking/VAD/tool-calling to AssemblyAI, which shrinks this
gap substantially — prefer Path A unless PGM evidence argues otherwise. No other chassis gap:
nothing in the event forces a vendor build-platform that would exclude pre-built scaffolding.

### Format analysis

* Build window: **29 days** (2026-09-01 15:00 UTC → 2026-09-30 15:00 UTC) — maps to weekly
  phases (Part B), not hourly sprints.
* Solo allowed: yes ("Teams consist of 1–6 people"; solo is within that range).
* Online only; no on-site component; no mandatory hosting platform named.
* Submission-field load: 10 fields incl. cover image (PNG/JPG 16:9), MP4 video, PDF slides,
  public GitHub repo, hosted Application URL. The chassis automates most of this:
  SUBMIT formats fields 1–4; DEMODRIVE captures screenshots/video material; DECKGEN fills the
  slide deck (export PDF); platform/deploy produces field 10. Manual residue: recording the
  human-narrated video over the demo, cover image, uploading.

### Rules risk scan — my chassis IS pre-built scaffolding

* Published obligations TODAY: submissions must be **original and MIT-compliant**;
  plagiarism/gaming = disqualification. The transcribed rule-book text contains **no explicit
  disclosure clause for pre-built scaffolding or AI assistance** `[unconfirmed]`.
* Per blueprint §1.3/§5, lablab's own norms allow prior non-AI scaffolding when the core
  AI-powered functionality is built in-window; lablab itself publishes starter repos. What
  would need disclosing if challenged: reused chassis components (resilience wrappers, cost
  guardrail, context buffer, media/platform wrappers, packaging tooling), AI-coding-tool
  assistance, and synthetic demo data. **Action regardless of the rule-book absence:** run
  `provo generate` and ship `disclosure.md` in the repo + README section. This costs nothing,
  matches MIT-compliance, and removes eligibility risk. The engine (agent prompts, dialogue
  policy, scoring logic, RAG content) is designed fresh during the window — that is the part
  originality attaches to.
* Repo hygiene: SUBMIT's secret-scan + commit-distribution report gates the final paste;
  commits spread across the month read well on GitHub.

### Judging-axis alignment with DECKGEN/SCRIPT/FAQDEF/SUBMIT output

| Axis | What the pipeline emits against it |
|---|---|
| Application of Technology | assembly manifest architecture summary (PROVO `prov-05` paragraph), live wrapped-call demo, deployed URL smoke-verified |
| Presentation | DECKGEN deck (13 slots + SVG charts), SCRIPT mm:ss timed script sized to the 3–5 min video band, DEMODRIVE golden capture opening on the working product |
| Business Value | plan's `specific_user` / `tam_figure` / `revenue_model` / `why_ai` fields feed deckgen charts verbatim |
| Originality | PGM evidence-grounded framing + PAS prior-art verdict report quoted in deck/Q&A |

### Risks & unknowns (all `[unconfirmed]` until kickoff)

1. Credit amount behind the signup link; whether credits cover a month of dev + demos.
2. Video-presentation length cap (rule-book rubric implies the 3–5 min band is optimal).
3. Judging-axis weights (not published).
4. "Builder access" details promised by the page ("will be shared as it becomes available").
5. Team-size confirmation (guidelines boilerplate 1–6 flagged unconfirmed in page source).
6. Whether new sponsor sub-challenges appear (`eventPrizes` empty today).
7. Voice Agent API (Path A) access tier/GA status for hackathon accounts.
8. Competitive density: ~395 enrolled before kickoff; voice-agent ideas will collide — PAS
   scan at Hour 0 is mandatory, not optional.
9. Rule book could gain an explicit disclosure clause; re-read before submitting.

**Effort estimate:** ~60–80 focused hours across the month for a solo entry (~2 h/day +
one deeper weekend block in week 1). Well inside capacity given the relaxed window.

**Verdict flips to WAIT if:** kickoff reveals a mandated end-to-end vendor build platform that
excludes custom codebases (blueprint §5 check #1); or Path A access is gated such that only an
expensive enterprise tier works; or the rules add an explicit ban on pre-built tooling.

---

## Part B — Step-by-step event walkthrough (execute only if participating)

> **Relation to TU16:** this adapts `docs/tutorials/TU16-mock-hackathon-walkthrough.md`
> (which consumes TU01–TU15) to ONE real event: **AssemblyAI – Voice Agent Hackathon**
> (lablab.ai, Sep 1–30, 2026). **Canonical brief:** `hackathon-projects/2026-09-assemblyAI/hackathon_brief.md` (DEFINITIVE 2026-09-01) — legacy prep brief archived at `hackathon-projects/2026-09-assemblyAI/hackathon_brief.md`. Candidate project *Mockrill* `[GUESS]` — PGM/PAS may pivot it at Hour 0.
>
> **Assumed shell:** Git Bash. **Run directory:** this repo root,
> `C:\Users\cesar\Documents\CursorAI-projects\hackathons` (except §W4/packaging steps marked
> otherwise). Tags: `[key]` = LLM API key needed · `[deploy]` = hosting account · `[net]` =
> network · `[browser]` = manual browser/account step. Everything else is offline.
>
> **Output convention (per XCUT-01):** prep artifacts under
> `hackathon-projects/2026-09-assemblyAI/work/` (canonical; legacy `hackathon-projects/2026-09-assemblyAI/work/` archived); the assembled submission working copy goes to the SIBLING folder OUTSIDE this repo (the assembler refuses destinations inside it):
>
> ```text
> CursorAI-projects
> |-- hackathons                      <- this repo (never modified during the event)
> |   |-- hackathon-projects/2026-09-assemblyAI  <- canonical brief + work (THIS FILE)
> |-- hackathon-entries
>     |-- 2026-09-assemblyAI         <- assembled working copy lives here (was 2026-09-AssemblyVoice)
> ```

### Window pacing (29 days → weekly phases, NOT the TU16 72-hour clock)

| Phase | Dates (2026) | Milestone |
|---|---|---|
| −1 Prep | August, anytime | checklist below, all calm |
| W1 Hour-0 | Tue Sep 1 – Thu Sep 3 | pipeline run, idea locked, working copy assembled, live voice loop talks to AssemblyAI |
| W1 rest | Fri Sep 4 – Sun Sep 7 | golden path end-to-end (speak → agent → spoken reply) |
| W2 Depth | Mon Sep 8 – Sun Sep 14 | agent quality (tool calling, scorecard), guardrails, eval harness wired, golden caches recorded |
| W3 Surface | Mon Sep 15 – Sun Sep 21 | mock-envelope UI polish, deploy early + smoke, first DEMODRIVE capture |
| W4 Package | Mon Sep 22 – Wed Sep 24 | PROVO/DECKGEN/SCRIPT/FAQDEF/SUBMIT, video recorded → **INTERNAL DEADLINE Wed Sep 24, 15:00 UTC** |
| Buffer | Thu Sep 25 – Mon Sep 28 | fixes, re-runs after any change, upload everything |
| Deadline | **Wed Sep 30, 15:00 UTC** | official End of Submissions |

### Phase −1 — Pre-event checklist (August; do calmly, never during the window)

```bash
# P0.1 install deps
pnpm install

# P0.2 offline doctor preflight (cold, <2 s)
npx vite-node scripts/chassis.ts doctor --manifest examples/dummy-fixtures/assembly/four-component-acme.json --skip-pings --output hackathon-projects/2026-09-assemblyAI/work/doctor-report.json

# P0.3 fix every "✘ missing env" row now (LLM keys in .env):
#   OPENAI_API_KEY, VERCEL_TOKEN, VERCEL_PROJECT_ID (+ ELEVENLABS_API_KEY if used)
```

* **P0.4 `[net]` Warm the Reddit cache from a RESIDENTIAL connection** (PGM-K2-05; datacenter
  IPs get 403). Subreddits matched to this event's theme (voice agents × interview/job prep ×
  speech products):

```bash
npx vite-node scripts/refresh-cache.ts --subreddits interviews,cscareerquestions,jobs,ExperiencedDevs,recruitinghell,languagelearning,speechrecognition --months 6
```

* **P0.5 One-time Prior-Art-Scanner Discord login** (interactive browser window incl. 2FA):

```bash
npx vite-node src/priorart/cli.ts discord-login --headful-timeout 900
```

* **P0.6 `[browser]` Claim AssemblyAI credits**: sign up via the event-page link (accept
  cookies; existing account → log out first, then log back in through the link). Save the key
  as `ASSEMBLYAI_API_KEY` in the future working copy's `.env`. Verify a 1-line streaming
  transcription call works BEFORE Sep 1.
* **P0.7 `[browser]` Register on BOTH lablab.ai (Enroll) and the lablab Discord
  (https://discord.gg/lablabai)**; skim Voice Agent API docs + Realtime STT docs + LLM Gateway
  docs + GitHub quickstarts (event page → Resources); skim the Hackathon Rule Book in a real
  browser and confirm nothing new about disclosures appeared.
* **P0.8 `[deploy]` Verify Vercel token/project still valid** (`npm run deploy:verify` needs a
  live deploy — just check the tokens exist and the project dashboard opens).

### W1 Hour 0 — Kickoff day (Tue Sep 1) sequence

**Step H0.0 — Watch kickoff (15:00 UTC) and update the brief.** Paste anything new (builder
access, video cap, extra constraints) into `hackathon-projects/2026-09-assemblyAI/hackathon_brief.md`,
deleting resolved `[unconfirmed]` marks. Then:

```bash
mkdir -p hackathon-projects/2026-09-assemblyAI/work
```

**Step H0.1 — Doctor preflight (offline, before any spend):**

```bash
npx vite-node scripts/chassis.ts doctor --manifest examples/dummy-fixtures/assembly/four-component-acme.json --skip-pings --output hackathon-projects/2026-09-assemblyAI/work/doctor-report.json
```

Fix every ✘ row now. Deep dive: TU11.

**Step H0.2 — Extract the event profile `[key]`:**

```bash
npx vite-node src/profile/cli.ts extract \
  --brief hackathon-projects/2026-09-assemblyAI/hackathon_brief.md \
  --out hackathon-projects/2026-09-assemblyAI/work/event_profile.json

# validate any time without an LLM:
npx vite-node src/profile/cli.ts --validate \
  hackathon-projects/2026-09-assemblyAI/work/event_profile.json \
  --brief hackathon-projects/2026-09-assemblyAI/hackathon_brief.md
```

Artifact: `hackathon-projects/2026-09-assemblyAI/work/event_profile.json`. Deep dive: TU07.

**Step H0.3 — Reddit problem grounding → first-draft winning plan**

```bash
# H0.3a ALWAYS FIRST: reachability probe (no stages, no LLM spend; MUST exit 0)
npx vite-node src/pgm/cli.ts --reddit-only
```

If exit 1 (HTTP 403): disable VPN / go residential, re-run Phase −1 P0.4 cache refresh,
re-probe until exit 0. Never spend LLM budget on a cold blocked cache.

```bash
# H0.3b RECOMMENDED keyless variant: LLM stages ride the sweep harness.
# Never run while another run_sweep.sh driver is active. Expect ~5–20 min.
npx vite-node src/pgm/cli.ts run \
  --brief hackathon-projects/2026-09-assemblyAI/hackathon_brief.md \
  --out hackathon-projects/2026-09-assemblyAI/work/pgm \
  --llm sweep --ceiling-minutes 90
```

```bash
# H0.3c alternative [key]: direct providers
python -m src.pgm.cli run \
  --brief hackathon-projects/2026-09-assemblyAI/hackathon_brief.md \
  --out hackathon-projects/2026-09-assemblyAI/work/pgm
```

Artifacts under `hackathon-projects/2026-09-assemblyAI/work/pgm/`: `personas.json`,
`mined_frustrations.json`, `pitch_candidates.json/.md`, `winning_project_plan.md`, `run.json`
(check `stage_statuses` + `grounded_fraction` before trusting outputs). A visible Chrome
window may open during mining — leave it alone while the run is live. Self-halt at ceiling =
by design; take partial outputs and move on. Deep dive: TU08.

**Step H0.4 — Prior-art scan, then pick the idea BY HAND**

```bash
export PAS_LIVE_SMOKE=1   # operator present for one Cloudflare-checkbox assist
npx vite-node src/priorart/cli.ts scan-lablab
unset PAS_LIVE_SMOKE
npx vite-node src/priorart/cli.ts scan-discord
npx vite-node src/priorart/cli.ts evaluate --candidates private/pgm/pitch_candidates.json
```

Read `private/priorart/prior_art_report.{json,md}` (verdicts pass/pivot/fail with corpus
quotes). Event-specific checks: the lablab gallery for existing voice agents, and THIS event's
dashboard team list — e.g. **Himaless / "IncidentBridge AI"** was already recruiting there on
2026-08-26; avoid colliding framings. Then the human step:

```bash
cp templates/idea-worksheet.md hackathon-projects/2026-09-assemblyAI/work/idea-worksheet.md
# ...fill by hand (≤20 min): ≥3 shortlisted framings passing all 5 checks...
pnpm lint:idea hackathon-projects/2026-09-assemblyAI/work/idea-worksheet.md
```

Merge the winner into `work/pgm/winning_project_plan.md` — the plan stays THE single
paste-input downstream. Deep dive: TU08/TU09.

**Step H0.5 — Pitch-deck skeleton (offline):**

```bash
cp -r templates/pitch-deck hackathon-projects/2026-09-assemblyAI/work/deck-skeleton
```

**Step H0.6 — Advisor proposes → YOU approve → assemble the working copy**

```bash
# advisor via the repo's own sweep harness (no API key; up to ~14 min silent;
# never while a sweep driver runs)
python scripts/run-advisor.py \
  --theme "Real-time voice agent on AssemblyAI" \
  --plan hackathon-projects/2026-09-assemblyAI/work/pgm/winning_project_plan.md \
  --llm sweep --sweep-role standard
```

Review `private/pgm/proposal.json`, then pass the ADV-04 human approval gate and assemble into
the sibling folder OUTSIDE this repo, always `--with-cache` (offline-proof against venue Wi-Fi):

```bash
echo y | python -m src.assembly.cli \
  --approve private/pgm/proposal.json \
  --out ../hackathon-entries/2026-09-assemblyAI \
  --with-cache
# OK: approved proposal assembled into "../hackathon-entries/2026-09-assemblyAI"; manifest: ...\assembly.manifest.json
```

Re-run the doctor preflight against the NEW working copy's own manifest (TU16 Step 0.1 rule):

```bash
npx vite-node scripts/chassis.ts doctor \
  --manifest ../hackathon-entries/2026-09-assemblyAI/assembly.manifest.json \
  --skip-pings \
  --output hackathon-projects/2026-09-assemblyAI/work/doctor-report-assembled.json
```

Then planner + implementor sweeps (harness ships inside the assembly; plans come from
`private/design_documents/` generated from `private/pgm/engine-building-prompt.md` — if that
prompt file exists, run it in a strong-model chat first, then each PROMPT-*.md in its own chat):

```bash
cd ../hackathon-entries/2026-09-assemblyAI
bash run_sweep.sh --planner
bash run_sweep.sh --sequence
```

Deep dives: TU10 (assembly/advisor), TU08 §1b (sweep transport).

**Hour-0 exit gate:** brief updated ✓ profile extracted ✓ plan + candidates mined ✓ idea picked
by hand ✓ deck skeleton copied ✓ working copy assembled ✓ doctor green on both manifests ✓.

### W1–W3 — Build-phase guidance (weekly rhythm; TU16 Steps H1–H4 adapted)

* **Every LLM call behind the cost guardrail** (TU03):

```python
from src.cost import create_cost_store, with_cost_guardrail
store = create_cost_store(path="cost-store.json")
guarded = with_cost_guardrail(call_llm, store=store)
```

Check spend any time (run from the working copy):

```bash
python -m src.cost.cli --store cost-store.json --json --budget cost-budget.json
```

* **Wrap every outbound call with resilience** (TU01) — especially each AssemblyAI WebSocket
  session: timeout_ms 15000, retries 1, fallback chain cache → none. Measure overhead and
  record golden caches while things are calm:

```bash
npx vite-node src/resilience/scripts/bench-resilience-overhead.ts    # target <5 ms median
npx vite-node src/resilience/scripts/record-golden.ts --provider assemblyai --model universal-3-pro --input req.json --output resp.json   # [key]
```

Mid-demo kill switch: `export RES_FORCED_DEGRADED=1` in the running shell.

* **Media wrappers** (TU05): route STT through `withStt`; if Path B, route TTS through
  `withTts` (set `ELEVENLABS_API_KEY` only if using ElevenLabs).
* **UI from MOCK envelopes, never a live backend** (TU06/TU11):

```bash
npm run build:ui        # sanity
npm run dev             # terminal 1 -> http://localhost:5173/
npm run mock:publish    # terminal 2 — scripted transcript/agent-state stream
```

* **Eval harness after EVERY agent change** (TU11):

```bash
# rehearse harness offline:
python -m src.dev.eval.cli --target tests.fixtures.stub:call_agent --cases examples/dummy-fixtures/evaluations/template.json
# real target [key]:
vite-node src/dev/eval/cli.ts --target evaluations/target.ts#callAgent --cases evaluations/cases.json
```

* **Deploy EARLY (target: end of W2), then smoke** `[deploy]`:

```bash
npm run deploy           # DEPLOY_PROVIDER defaults to vercel
npm run deploy:verify    # polls GET $PUBLIC_URL/health every 2 s, up to 30 s
```

* **Staleness tracking from day 1**, after any regeneration:

```bash
python -m src.dev.track.cli status
```

Weekly cadence suggestion: Monday = track status + eval suite green; Friday = deploy smoke +
golden-cache refresh + one DEMODRIVE capture (insurance grows over time).

### W4 — Packaging (from the working-copy root unless stated)

```bash
cd ../hackathon-entries/2026-09-assemblyAI

# W4.1 PROVO disclosure (offline) — regenerate whenever the plan changed
npx vite-node src/provenance/provo/cli.ts generate --manifest assembly.manifest.json --out disclosure.md
npx vite-node src/provenance/provo/cli.ts summary --manifest assembly.manifest.json

# W4.2 DECKGEN first pass --no-llm (offline), then optional LLM polish [key]
npx vite-node src/ideation/deckgen/cli.ts populate --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out deck/ --no-llm
# export deck/ to PDF (rule book: slides must be PDF)

# W4.3 SCRIPT timed pitch (offline) — size to the 3–5 min video band
cp examples/dummy-fixtures/script/timing.example.yaml my-timing.yaml   # edit minutes only (total ≤5)
npx vite-node src/ideation/script/cli.ts validate --plan winning_project_plan.md --manifest assembly.manifest.json --config my-timing.yaml
npx vite-node src/ideation/script/cli.ts generate --plan winning_project_plan.md --manifest assembly.manifest.json --config my-timing.yaml --out script.md
```

(The `examples/…` fixtures live in the chassis repo — copy `timing.example.yaml` from
`C:\Users\cesar\Documents\CursorAI-projects\hackathons\examples\dummy-fixtures\script\` if the
working copy does not carry them.)

```bash
# W4.4 FAQDEF judge Q&A sheet [key], then drill offline
npx vite-node src/ideation/faqdef/cli.ts generate --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out docs/qa
npx vite-node src/ideation/faqdef/cli.ts rehearse --qa docs/qa/qa-sheet.md --count 5 --budget 90
npx vite-node src/ideation/faqdef/cli.ts rehearse --qa docs/qa/qa-sheet.md --axes business_value,application_of_technology

# W4.5 DEMODRIVE golden demo capture — EARLY, it IS the fallback ladder rung 3
npm run dev                                                        # terminal 1
npx vite-node src/ideation/demodrive/cli.ts validate --script demodrive-script.json
npx vite-node src/ideation/demodrive/cli.ts capture --script demodrive-script.json --data-source mock --out assets/demodrive --fast --full-page   # terminal 2

# W4.6 SUBMIT formats all 10 fields; disclosure embedded verbatim
npx vite-node src/provenance/provo/cli.ts generate --manifest assembly.manifest.json --out disclosure.md   # re-run if anything changed
npx vite-node src/provenance/submit/cli.ts format --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out submission.md

# W4.7 final TRACK gate (want 0 stale rows)
python -m src.dev.track.cli status
```

BENCH (`python -m src.dev.bench.cli run --dummy examples/dummy-fixtures/bench/sample_brief.md
--manifest assembly.manifest.json --report reports/bench`) needs an LLM endpoint/stub per
`config/bench.json` — per TU16 run it PRE-event only (Phase −1/W1), never in the final days.

Manual residue (not automatable): record the narrated MP4 video over the DEMODRIVE capture /
live demo (3–5 min band), make the 16:9 PNG/JPG cover image, export deck PDF, push the public
GitHub repo, fill the 10-field form on the event page.

### ⏰ DEADLINE BOX

```text
OFFICIAL:  Wed 2026-09-30, 15:00 UTC (= 19:00 GST, as published)  — End of Submissions
INTERNAL:  Wed 2026-09-24, 15:00 UTC  (~20% of the 29-day window earlier)
           Everything packaged, video recorded, form ready to paste.
ABSOLUTE FALLBACK: manual submission exists only up to 6 h post-deadline AND
           only with prior organizer/mentor approval — do not plan around it.
After ANY change past Sep 24: re-run PROVO → SUBMIT → track status (they are pure functions).
```

### Skip-table — what to cut when behind vs never skip

| Situation | Skip | Never skip |
|---|---|---|
| Behind at W1 end | PGM tier-2 extra candidates; second PRIOR-ART corpus (Discord) if blocked | `--reddit-only` probe exit 0; IDEA worksheet (≤20 min); assembly + doctor |
| Sponsor/API friction | Path A → drop to Path B (or vice versa); multilingual extras | ASSEMBLYAI_API_KEY verified working before building on it |
| Agent quality plateau | Eval cases beyond core 5; LLM-polished deck pass (`--no-llm` output ships) | Cost guardrail + resilience wrapping of every call |
| Deploy blocked late | Hosted Application URL is a field — try a second DEPLOY_PROVIDER (replit/docker); last resort document localhost + video | Mock-envelope demo + recorded golden video |
| Polish spiral in W4 | Deck LLM polish; Q&A drilling beyond 5 questions | `track status` green sweep; `submit format` re-run after every upstream change; disclosure accuracy |
| Time-crushed overall | Synthetic-data generator; extra UI themes; bench re-run | PROVO disclosure; DEMODRIVE early capture; deadline box internal date |

### Degraded-demo fallback ladder (present at the highest rung that works; never apologize downward)

1. **Live** — real microphone → AssemblyAI streaming through wrapped paths (guards active).
2. **Degraded live** — `export RES_FORCED_DEGRADED=1`; wrapped calls serve golden caches
   instantly; UI keeps ticking; replay a cached session transcript.
3. **Recorded video** — the DEMODRIVE capture from W4.5 (captured early as insurance).
4. **Localhost sync render** — `npm run dev` + `npm run mock:publish` replaying mock envelopes;
   zero network dependency; works on airplane Wi-Fi.

### Troubleshooting quick hits

* `pgm run` self-halts at its ceiling: by design — take partial outputs; on the sweep path keep
  `--ceiling-minutes 90`.
* `--reddit-only` exit 1 / `mining_no_reddit_data`: IP blocked + cold cache — go residential,
  `scripts/refresh-cache.ts`, re-probe to exit 0 before spending.
* `pgm --llm sweep` refuses ("another driver is running"): finish/remove the other driver;
  `.run_sweep.lock`.
* Advisor silent >14 min: normal on agentic turns; output lands in `private/pgm/proposal.json`.
* Assembler refuses destination: never assemble inside this repo — use
  `../hackathon-entries/2026-09-assemblyAI`.
* `deckgen` warns about Business Value figures: fill `specific_user`, `tam_figure`,
  `revenue_model`, `why_ai` in the plan.
* `script validate` exit 1: timing minutes must sum to `total_minutes` (keep total ≤5).
* `submission.md` shows "Disclosure not yet generated": PROVO ran after SUBMIT — rerun SUBMIT.
* Doctor FAILED at Hour 0: that is its job — fix each ✘ row before continuing.
* AssemblyAI 401/quota surprise mid-build: that is why P0.6 verifies the key in August; check
  credit balance in the AAI dashboard weekly.

### Printable ordered checklist

```text
PHASE -1 (August)
[ ] pnpm install
[ ] npx vite-node scripts/chassis.ts doctor --manifest examples/dummy-fixtures/assembly/four-component-acme.json --skip-pings --output hackathon-projects/2026-09-assemblyAI/work/doctor-report.json
[ ] .env complete: OPENAI_API_KEY, VERCEL_TOKEN, VERCEL_PROJECT_ID (+ELEVENLABS_API_KEY?)
[ ] npx vite-node scripts/refresh-cache.ts --subreddits interviews,cscareerquestions,jobs,ExperiencedDevs,recruitinghell,languagelearning,speechrecognition --months 6   [residential IP]
[ ] npx vite-node src/priorart/cli.ts discord-login --headful-timeout 900        [browser, 2FA]
[ ] claim AAI credits via event link (accept cookies; logout-first) + verify ASSEMBLYAI_API_KEY works   [browser]
[ ] register lablab.ai + join Discord; skim AAI docs + rule book                  [browser]

W1 HOUR 0 (Sep 1)
[ ] watch kickoff; update hackathon_brief.md, resolve [unconfirmed] marks         [browser]
[ ] npx vite-node scripts/chassis.ts doctor --manifest examples/dummy-fixtures/assembly/four-component-acme.json --skip-pings
[ ] npx vite-node src/profile/cli.ts extract --brief hackathon-projects/2026-09-assemblyAI/hackathon_brief.md --out hackathon-projects/2026-09-assemblyAI/work/event_profile.json        [key]
[ ] npx vite-node src/pgm/cli.ts --reddit-only                                    # MUST exit 0
[ ] npx vite-node src/pgm/cli.ts run --brief hackathon-projects/2026-09-assemblyAI/hackathon_brief.md --out hackathon-projects/2026-09-assemblyAI/work/pgm --llm sweep --ceiling-minutes 90
[ ] export PAS_LIVE_SMOKE=1 && npx vite-node src/priorart/cli.ts scan-lablab && unset PAS_LIVE_SMOKE
[ ] npx vite-node src/priorart/cli.ts scan-discord
[ ] npx vite-node src/priorart/cli.ts evaluate --candidates private/pgm/pitch_candidates.json
[ ] cp templates/idea-worksheet.md hackathon-projects/2026-09-assemblyAI/work/idea-worksheet.md   # fill by hand
[ ] pnpm lint:idea hackathon-projects/2026-09-assemblyAI/work/idea-worksheet.md
[ ] cp -r templates/pitch-deck hackathon-projects/2026-09-assemblyAI/work/deck-skeleton
[ ] python scripts/run-advisor.py --theme "Real-time voice agent on AssemblyAI" --plan hackathon-projects/2026-09-assemblyAI/work/pgm/winning_project_plan.md --llm sweep --sweep-role standard
[ ] echo y | python -m src.assembly.cli --approve private/pgm/proposal.json --out ../hackathon-entries/2026-09-assemblyAI --with-cache
[ ] npx vite-node scripts/chassis.ts doctor --manifest ../hackathon-entries/2026-09-assemblyAI/assembly.manifest.json --skip-pings --output hackathon-projects/2026-09-assemblyAI/work/doctor-report-assembled.json
[ ] cd ../hackathon-entries/2026-09-assemblyAI && bash run_sweep.sh --planner
[ ] bash run_sweep.sh --sequence

W1-W3 BUILD
[ ] wrap every LLM call: with_cost_guardrail(...)                                 [TU03]
[ ] wrap every AssemblyAI/WS call: withResilience(...); bench overhead; record goldens
[ ] npm run build:ui ; npm run dev ; npm run mock:publish                         [TU06/TU11]
[ ] eval harness after every agent change                                         [TU11]
[ ] npm run deploy ; npm run deploy:verify                                        [deploy, by end of W2]
[ ] python -m src.dev.track.cli status                                            # Mondays + after regenerations

W4 PACKAGE (Sep 22-24) — from ../hackathon-entries/2026-09-assemblyAI
[ ] npx vite-node src/provenance/provo/cli.ts generate --manifest assembly.manifest.json --out disclosure.md
[ ] npx vite-node src/provenance/provo/cli.ts summary --manifest assembly.manifest.json
[ ] npx vite-node src/ideation/deckgen/cli.ts populate --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out deck/ --no-llm
[ ] cp timing example -> my-timing.yaml (total <=5 min); script validate; script generate --out script.md
[ ] npx vite-node src/ideation/faqdef/cli.ts generate --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out docs/qa     [key]
[ ] npx vite-node src/ideation/faqdef/cli.ts rehearse --qa docs/qa/qa-sheet.md --count 5 --budget 90
[ ] npm run dev + demodrive validate + demodrive capture --data-source mock --out assets/demodrive --fast --full-page
[ ] npx vite-node src/provenance/submit/cli.ts format --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out submission.md
[ ] python -m src.dev.track.cli status                                            # 0 stale
[ ] record MP4 video (3-5 min), cover image 16:9 PNG/JPG, deck -> PDF             [manual]
[ ] INTERNAL DEADLINE Wed Sep 24 15:00 UTC: form ready to paste

BUFFER + SUBMIT (Sep 25-30)
[ ] re-run provo -> submit -> track after ANY change
[ ] paste all 10 fields on the event page; verify links work in incognito
[ ] OFFICIAL DEADLINE Wed Sep 30 15:00 UTC — submitted before, ideally days before

POST-EVENT (in the chassis repo)
[ ] cp templates/retro.md hackathon-projects/2026-09-assemblyAI/work/retro-<date>.md    # fill <=15 min
[ ] node scripts/lint-retro.ts hackathon-projects/2026-09-assemblyAI/work/retro-*.md
```

# DP-PITCH — Deck (PDF), Timed Script, Judge Q&A & DEMODRIVE Capture

## §1 Purpose & scope

### §1.1 What this plan delivers

- Deck PDF via `deckgen populate --no-llm` → `deck/` → `deck/mockrill-deck.pdf` with 12-slide order and TAM honesty rule.
- Timed script `script.md` at 4:00 via `my-timing.yaml` validate+generate opening on ticking transcript.
- Judge Q&A `docs/qa/qa-sheet.md` via `faqdef generate` plus five verbatim answers and `faqdef rehearse` twice.
- DEMODRIVE capture `assets/demodrive/` via `demodrive-script.json` validate+capture with weekly re-capture rule.
- Cover `assets/cover.png` 1920x1080 and `docs/video-shotlist.md` with rehearsals ≤5:00.

### §1.2 Explicitly OUT of scope, and which DP owns it instead

| Out-of-scope item | Owning DP | Reason |
|---|---|---|
| Contracts M1-M15 types, steps, envelope, time | DP-CONTRACTS | Vocabulary; import only |
| Voice streaming M16-M20 aai-token, mic, streamingClient | DP-AAI-STREAM | Mic+streaming |
| Turn-taking M21-M23 speak, turnController | DP-TURNTAKING | State machine |
| Interviewer M24-M29 TurnRequest, tools, llmGateway, api/turn | DP-INTERVIEWER | LLM orchestration |
| Scoring M30-M36 fillers, evidence, rubric, scorecard | DP-SCORECARD | Scoring logic |
| UI M37-M39 eventBus, useMockrillEvents, main.tsx | DP-UI | Presentation |
| Health/vercel M40-M41 api/health, vercel.json | DP-DEPLOY | Deployment |
| Golden/mocks M42-M44 session-golden, mock-publish, fallback-ladder | DP-DEMOPROOF | Offline replay |
| Diagram/disclosure/submission M45-M46 architecture, submission.md | DP-SUBMIT | Provenance |
| Build scripts build/preview | DP-DEPLOY | Build |

## §2 Requirements

| # | Requirement | Source | Judging axis |
|---|---|---|---|
| R-PITCH-01 | Prerequisite gate WU-PITCH-00 verifies disclosure.md and architecture-summary.md exist before any pitch work | Prompt WU-PITCH-00 | Presentation |
| R-PITCH-02 | Deck 12 slides with order and judging axis each | Prompt deck section | Presentation |
| R-PITCH-03 | Business-value slide bottom-up TAM arithmetic visible, grounded false, no invented figure | Prompt TAM honesty | Business Value |
| R-PITCH-04 | AssemblyAI slide literal params format_turns etc | Prompt AssemblyAI usage | Application of Technology |
| R-PITCH-05 | my-timing.yaml 4:00 and opens on transcript not title | Prompt script | Presentation |
| R-PITCH-06 | faqdef generate + five verbatim answers | Prompt Q&A | Presentation/Business/Originality |
| R-PITCH-07 | faqdef rehearse twice --count 5 --budget 90 | Prompt rehearse | Presentation |
| R-PITCH-08 | demodrive-script.json validate | Prompt demodrive | Presentation |
| R-PITCH-09 | demodrive capture week3 + weekly re-capture | Prompt capture early | Presentation |
| R-PITCH-10 | deck→PDF and cover 1920x1080 | Prompt cover | Presentation |
| R-PITCH-11 | video-shotlist mm:ss matching script.md + 2 rehearsals ≤5:00 | Prompt shotlist | Presentation |

## §3 Contracts OWNED by this plan

> Rule for every contract below: file path and exported name are exact. Consumers MUST import this from the owning path shown; re-defining, re-typing, stubbing or copying it is a defect.

### No TS exports — artifact ownership

DP-PITCH owns **artifacts, not TypeScript exports**. There are no M-numbers for this plan; the inter-module contract table (S7) lists M1-M46 owned by other DPs. DP-PITCH owns the files listed in §6 file map. For each artifact the owning sentence is: *"Consumers MUST reference this from the path shown; re-defining or stubbing it is a defect."*

Artifacts owned:
- `deck/` directory + `deck/mockrill-deck.pdf` (submission field 7)
- `my-timing.yaml` (timing config, not shipped)
- `script.md` (4:00 timed script)
- `docs/qa/qa-sheet.md` (Q&A sheet)
- `demodrive-script.json` (DEMODRIVE click script) + `assets/demodrive/` capture output (fallback-ladder rung 3)
- `assets/cover.png` (16:9 1920×1080)
- `docs/video-shotlist.md` (shot-by-shot)

Consumers: judges, lablab submission form (fields 5-7), `docs/repackage.md` regeneration order, DP-SUBMIT `submission.md` fields 5-7 reference these.

### Deck slide contract (normative slide order — 12 slides)

| # | Title | One-sentence job | Judging axis |
|---|---|---|---|
| 01 | Title + hook | Mockrill — Realtime AI Mock-Interview Voice Coach + one-line hook: "Rehearse the screen that freezes you — then say it better on the same call." | Presentation |
| 02 | Problem | The spoken screen: 15-min voice screen where filler, vague STAR, and freeze cost the offer; text prep cannot observe speech | Presentation + Business Value |
| 03 | Specific user | Junior bootcamp grads / career switchers (named segments, never "everyone") — 12-24 weeks post-grad, 2-5 applications/week | Business Value |
| 04 | Product in one sentence | Voice interviewer that asks role-specific questions with real turn-taking/barge-in, then returns timestamped evidence + re-drills weakest answer by voice | Originality + App-of-Tech |
| 05 | Business value | B2C $19/mo subscription + B2B bootcamp career-services licensing per-seat; bottom-up TAM arithmetic visible (see §5 A3) | Business Value |
| 06 | How it works | Architecture diagram from `docs/architecture.mmd` (S4): mic → StreamingClient → wss → TurnController → speechSynthesis + POST /api/turn → LLM Gateway | Application of Technology |
| 07 | AssemblyAI usage | Universal-3.5-Pro streaming literal params + LLM Gateway JSON-Schema tool calling (see §5 A4) | Application of Technology |
| 08 | Originality / prior art | Prior art: evidence-backed voice agents (timestamp citations), generic interview bots; differentiator: re-drill loop on same socket | Originality |
| 09 | Re-drill loop | Quote exact moment at 07:42, then candidate says it again better in same session, same socket | Originality |
| 10 | Demo | 20-sec ticking transcript + live or DEMODRIVE capture; link to Application URL | Presentation |
| 11 | What's next | 30/60/90-day: more roles, hiring-manager rubric tuning, B2B pilot | Business Value |
| 12 | Disclosure + license | MIT 2026 Mockrill Contributors; disclosure.md provenance; assembly.manifest includes | Presentation (gate) |

PDF export is normative via `npx vite-node src/ideation/deckgen/cli.ts` → HTML then print to PDF or `deckgen validate` + browser print; exact command in WU-PITCH-10.

## §4 Contracts CONSUMED by this plan

| # | Import path | Export | Signature | Owning module / DP |
|---|---|---|---|---|
| C1 | `assembly.manifest.json` | manifest JSON | `{ includes:["resilience","platform","context","ideation","provenance"], excludes:["media","dev-tooling","assembly-advisory","data","cost","pgm","profile"] }` read-only | Chassis |
| C2 | `winning_project_plan.md` | winning plan | Markdown with `grounded:false`, `tam_figure:[figure to pin down]` read-only | Repo root |
| C3 | `disclosure.md` | disclosure markdown | Generated by `src/provenance/provo/cli.ts generate` — must exist before WU-PITCH-01 | DP-SUBMIT |
| C4 | `architecture-summary.md` | summary markdown | Generated by `provo summary` — must exist before WU-PITCH-01 | DP-SUBMIT |
| C5 | `docs/architecture.mmd` / `.png` | diagram | M45 runtime data-flow (S4) embedded in slide 06 | DP-SUBMIT |
| C6 | `src/ideation/deckgen/cli.ts` (CLI) | `populate`, `diagram`, `validate` | `npx vite-node src/ideation/deckgen/cli.ts populate --plan <path> --manifest <path> --disclosure <path> --out <path> --no-llm` pure function | Chassis `ideation` |
| C7 | `src/ideation/script/cli.ts` (CLI) | `validate`, `generate` | `npx vite-node src/ideation/script/cli.ts validate --plan <path> --manifest <path> --config <path>` and `generate --plan --manifest --config --out` | Chassis `ideation` |
| C8 | `src/ideation/faqdef/cli.ts` (CLI) | `generate`, `rehearse` | `npx vite-node src/ideation/faqdef/cli.ts generate --plan --manifest --disclosure --out <dir>` and `rehearse --qa <path> --count 5 --budget 90` | Chassis `ideation` |
| C9 | `src/ideation/demodrive/cli.ts` (CLI) | `validate`, `capture` | `npx vite-node src/ideation/demodrive/cli.ts validate --script <path>` and `capture --script <path> --data-source mock --out <dir> --fast --full-page` | Chassis `ideation` |
| C10 | `src/mockrill/contracts/types.ts` | `TranscriptTurn`, `EvidenceQuote`, `AnswerScore` | Deterministic evidence vs LLM hallucination distinction used in Q&A verbatim | DP-CONTRACTS |
| C11 | `src/mockrill/scoring/rubric.ts` | `mergeScores` | `(llm:AnswerScore|null, det:AnswerScore)=>AnswerScore` discards LLM quotes | DP-SCORECARD |
| C12 | `fixtures/mockrill/session-golden.json` + `scripts/mockrill-mock-publish.ts` | golden fixture + SSE publisher at :8787 | DEMODRIVE mock data-source | DP-DEMOPROOF |
| C13 | `submission.md` (M46) | 10 submission fields | Fields 5-7 consumed as outputs of this plan | DP-SUBMIT |

**Rules:** This plan MUST NOT re-implement, re-type, or stub any chassis CLI; invoke only via `npx vite-node <path> <command>`. `assembly.manifest.json`, `src/ideation/*`, `src/provenance/*` are read-only. Never import `src/media`, `src/cost`, `src/dev`, `src/pgm`, `src/profile`, `src/assembly`. `ASSEMBLYAI_API_KEY` never read by this plan.

## §5 Algorithms

### A0 Prerequisite gate (WU-PITCH-00)

```
1. Check `disclosure.md` exists at repo root: `test -f disclosure.md` must exit 0; first line contains Disclosure/Provenance.
2. Check `architecture-summary.md` exists: `test -f architecture-summary.md` must exit 0; contains resilience,platform.
3. If either missing: STOP — run DP-SUBMIT first (`provo generate` + `provo summary`) — do NOT hand-write them.
4. Print "WU-PITCH-00 gate pass" and proceed.
```

### A1 Deck populate --no-llm (WU-PITCH-01)

```
1. Prereqs: disclosure.md + architecture-summary.md exist (A0).
2. Run: `npx vite-node src/ideation/deckgen/cli.ts populate --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out deck/ --no-llm`
   Pure function; reads plan+manifest+disclosure; writes deck/ with slide markdown/HTML and assets; exits 0.
3. Verify deck/ contains at least: deck/slides.md or deck/index.html or deck/slide-01.* (any single deck entry counts) and docs/architecture.mmd embedded or copied.
4. Optional LLM polish pass (second command without --no-llm): `npx vite-node src/ideation/deckgen/cli.ts populate --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out deck/ --llm` — not required for shippable; offline --no-llm output is already shippable.
5. Verify validate: `npx vite-node src/ideation/deckgen/cli.ts validate --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out deck/` exits 0 (if validate requires --out, use deck/; if it validates in-place, omit --out per CLI help).
```

### A2 Business-value slide bottom-up TAM (WU-PITCH-02)

TAM honesty rule: winning_project_plan.md carries grounded:false and tam_figure:[figure to pin down]; pgm/profile excluded so no automated grounding. DO NOT invent market figure.

Slide 05 must show arithmetic visibly:
```
Example bottom-up (numbers labelled [estimate] or cited):
  US bootcamp grads per year:  ~90,000 [estimate — Course Report 2024]
  Career-switcher self-learners seeking interview prep: ~150,000 [estimate]
  Addressable junior seekers / year: 90k + 150k = 240,000
  Willing to pay for voice practice: 15% [estimate] => 36,000 users
  B2C: 36,000 * $19/mo * 3 mo avg = $2.05M annual revenue potential [estimate]
  B2B: 500 bootcamps [estimate] * 20 seats avg * $499/yr licence = $4.99M [estimate]
  Combined bottom-up TAM = ~$7M ARR at 100% penetration; SAM (10% capture) = ~$700k ARR
Show every input, mark each [estimate] or citation, show multiplication on slide. Caption: "No pgm/profile grounding available — inputs labelled [estimate]; arithmetic shown."
```
Algorithm:
```
1. Write slide 05 markdown with table above verbatim (or updated cited figures but same arithmetic shape).
2. No invented big number like "$50B market" — that fails honesty rule.
3. Cite or label [estimate] per input.
4. State in speaker notes: visibly honest estimate beats unsourced big number in front of judges.
```

### A3 AssemblyAI-usage slide literal parameters (WU-PITCH-03)

Slide 07 must contain literal strings verbatim:
```
Streaming STT: wss://streaming.assemblyai.com/v3/ws
  speech_model: universal-3-5-pro (or universal-3-5-pro literal)
  sample_rate: 16000
  encoding: pcm_s16le
  format_turns: true (boolean literal shown)
  keyterms_prompt: string[] (e.g. ["STAR","React","system design"])
  end_of_turn_confidence_threshold: 0.4
  min_turn_silence, max_turn_silence: 1536 ms default
  vad_threshold: 0.2
  interruption_delay: (0-1000 ms) e.g. 200 ms
  mode: balanced
Token: GET https://streaming.assemblyai.com/v3/token expires_in_seconds 1-600
LLM Gateway: POST https://llm-gateway.assemblyai.com/v1/chat/completions
  model: claude-sonnet-4-6 primary, qwen3.5-4b-32k-fast fallback (MOCKRILL_LLM_FALLBACK_MODEL)
  tools: [{type:"function",function:{name,description,parameters:<JSON Schema>}}]
  tool_choice
Voice output: window.speechSynthesis (no TTS vendor)
Billing: socket-open duration; always send {type:"Terminate"}
```
Also note Path B equals Path A: both are equal alternatives, hosted URL needs serverless which cannot hold long-lived socket (S4).

### A4 my-timing.yaml + validate (WU-PITCH-04)

`examples/` fixtures are git-ignored; timing file is authored fresh. Full contents normative:
```yaml
# my-timing.yaml — Mockrill 4:00 timed script (inside 3-5 min band, 1 min margin both ends)
# Rule: video opens on ticking transcript, not title slide — first 10 seconds decide Presentation score
total: "4:00"
sections:
  - name: hook_transcript_open
    duration: "00:10"
    note: "Open on ticking transcript (words streaming with timestamps) — NO title slide"
  - name: problem
    duration: "00:25"
    note: "Spoken-screen freeze" 
  - name: user_and_product
    duration: "00:30"
    note: "Junior bootcamp grads / career switchers; product in one sentence"
  - name: how_it_works
    duration: "00:30"
    note: "Architecture diagram from docs/architecture.mmd"
  - name: assemblyai_usage
    duration: "00:30"
    note: "Literal params: format_turns, keyterms_prompt, thresholds"
  - name: demo
    duration: "01:05"
    note: "Real spoken session — transcript → scorecard → re-drill (DEMODRIVE fallback only if live fails)"
  - name: business_value
    duration: "00:25"
    note: "B2C+B2B + TAM arithmetic visible"
  - name: originality_and_next
    duration: "00:15"
    note: "Prior art + differentiator + what's next"
  - name: close_disclosure
    duration: "00:10"
    note: "Disclosure + MIT license + Application URL"
# Sum = 10+25+30+30+30+65+25+15+10 = 240s = 4:00 exactly
```
Validate:
```
1. Write my-timing.yaml at repo root with exact YAML above (total 4:00).
2. Run `npx vite-node src/ideation/script/cli.ts validate --plan winning_project_plan.md --manifest assembly.manifest.json --config my-timing.yaml` must exit 0 and first output line contains "valid" or "ok" or "pass".
3. If validate fails on total mismatch, adjust durations but keep total 4:00 and opening 00:10 transcript rule.
```

### A5 script generate (WU-PITCH-05)

```
1. Prereq: my-timing.yaml validated (A4) exit 0.
2. Run `npx vite-node src/ideation/script/cli.ts generate --plan winning_project_plan.md --manifest assembly.manifest.json --config my-timing.yaml --out script.md` must exit 0.
3. Verify script.md exists; first line contains Script or Mockrill; total duration string "4:00" appears; word count implies ~550-650 words (4 min at ~140 wpm).
4. Assert opening line/shot is transcript ticking, not title slide (grep script.md for "transcript" in first 200 chars).
5. Per-section budgets match my-timing.yaml sections.
```

### A6 Judge Q&A generate + five verbatim answers (WU-PITCH-06)

```
1. Run `npx vite-node src/ideation/faqdef/cli.ts generate --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out docs/qa` exit 0, writes docs/qa/qa-sheet.md.
2. Verify docs/qa/qa-sheet.md exists and contains generated questions.
3. Append (or ensure) verbatim answers section "## Verbatim close-call answers" with EXACT texts below — these decide close call:
```
Verbatim answers (copy verbatim):
1. Why AssemblyAI and not any STT?
> Because only AssemblyAI streaming gives us word-level timestamps with end_of_turn / turn_is_formatted turn semantics — words[].start/end (ms from session start) plus turn_is_formatted and end_of_turn make timestamped evidence ("at 07:42 you said 'kind of' 3×") and natural barge-in possible. That is deterministic detection over words[].start/end, not an LLM quote. And the LLM Gateway keeps the whole stack on one key (ASSEMBLYAI_API_KEY). Literal socket params we use: wss://streaming.assemblyai.com/v3/ws with speech_model universal-3-5-pro, sample_rate 16000, encoding pcm_s16le, format_turns true, keyterms_prompt [role-specific terms], end_of_turn_confidence_threshold 0.4, vad_threshold 0.2, interruption_delay ~200 ms, mode balanced, plus GET https://streaming.assemblyai.com/v3/token for the short-lived browser token and POST https://llm-gateway.assemblyai.com/v1/chat/completions with JSON-Schema tools.
2. You chose Path B — isn't Path A the 'real' one?
> The brief lists both as equal alternatives. The hosted Application URL required by field 10 needs a serverless deployment (Vercel static + three stateless functions), which cannot hold a long-lived socket — Audio never proxies through a serverless function. Path B puts MORE AssemblyAI surface in the shipped product, not less: streaming STT over WebSocket plus LLM Gateway JSON-Schema tool calling, both on the same ASSEMBLYAI_API_KEY, versus Path A which would hide orchestration behind one opaque connection.
3. How do I know the scorecard isn't hallucinated?
> Evidence quotes come from deterministic detection over words[].start/end, never from the LLM. detectFillers(turn: TranscriptTurn) scans words[] for FILLER_LEXICON hits and buildEvidence maps those to EvidenceQuote {start_ms,end_ms}. mergeScores(llm, det) explicitly discards LLM-supplied quotes and keeps only deterministic evidence; the LLM only supplies axes/structure scores. So the timestamp you see is traceable to the socket Turn payload.
4. What's the business model / who exactly pays?
> Named user: junior bootcamp grads and career switchers in the first 12-24 weeks post-grad, 2-5 applications/week. They pay B2C $19/mo subscription for unlimited voice drills. Bootcamp career-services pay B2B per-seat licensing (e.g. $499/yr per seat, 20 seats avg per bootcamp) to offer Mockrill as part of tuition. Bottom-up arithmetic is on slide 05: ~90k US bootcamp grads/yr [estimate] + ~150k self-learners [estimate] = 240k addressable/yr; 15% willing => 36k; B2C 36k* $19*3 mo = $2.05M plus B2B 500 bootcamps*20*$499 = $4.99M => ~$7M ARR at 100%, SAM ~$700k at 10% — all inputs labelled [estimate].
5. What's original here — there are other interview bots?
> Overlapping prior art: evidence-backed voice agents with speaker+timestamp citations, and generic interview-prep bots that ask text questions. The differentiator is the re-drill loop: quote the exact moment ("at 07:42 you said ...") then make the candidate say it again better in the same session, on the same socket, with the same word-level timestamp evidence. The socket stays open; TurnController stays in scoring→drill; the LLM Gateway re-asks the weakest question (selectWeakest) and new words[].start/end are compared. No prior interview bot does quote-then-re-say on the same streaming session.
```
4. Verify docs/qa/qa-sheet.md contains all five question substrings and five verbatim answers.

### A7 rehearse twice (WU-PITCH-07)

```
1. Run `npx vite-node src/ideation/faqdef/cli.ts rehearse --qa docs/qa/qa-sheet.md --count 5 --budget 90` — must exit 0; first output line contains rehearsed/rehearse/pass.
2. Run again same command (twice total) — second run must also exit 0.
3. If budget 90 means 90 seconds per answer, 5*90 = 450s total; verify output mentions budget/90.
```

### A8 demodrive-script.json + validate (WU-PITCH-08)

Full contents normative (click sequence Setup → LiveCall → ScorecardView → Drill):
```json
{
  "version": "1.0.0",
  "baseUrl": "http://localhost:4173",
  "steps": [
    { "action": "goto", "url": "/" },
    { "action": "click", "selector": "[data-testid='setup-start']", "note": "Setup screen — select role" },
    { "action": "click", "selector": "[data-testid='role-select']", "note": "Choose role (e.g. frontend)" },
    { "action": "click", "selector": "[data-testid='connect-button']", "note": "LiveCall — connect mic / start session" },
    { "action": "wait", "ms": 2000, "note": "Allow Begin + first Turn to stream" },
    { "action": "click", "selector": "[data-testid='answer-trigger']", "note": "Simulate candidate turn (mock data-source injects TranscriptTurn)" },
    { "action": "wait", "ms": 3000, "note": "Score streaming" },
    { "action": "click", "selector": "[data-testid='scorecard-link']", "note": "Navigate to ScorecardView" },
    { "action": "wait", "ms": 1000 },
    { "action": "click", "selector": "[data-testid='drill-button']", "note": "Drill weakest question" },
    { "action": "wait", "ms": 2000 },
    { "action": "screenshot", "fullPage": true, "note": "Capture final state" }
  ],
  "viewport": { "width": 1280, "height": 720 },
  "fullPage": true,
  "fast": true
}
```
Validate:
```
1. Write demodrive-script.json at repo root with JSON above.
2. Run `npx vite-node src/ideation/demodrive/cli.ts validate --script demodrive-script.json` exit 0, first line contains valid/ok/pass.
```

### A9 demodrive capture week 3 + weekly re-capture (WU-PITCH-09)

```
1. Terminal 1: `npm run dev` (Vite on 5173) OR `npm run preview -- --port 4173` if built.
2. Terminal 2: `npm run mock:publish` (vite-node scripts/mockrill-mock-publish.ts SSE :8787/events/stream replaying fixtures/mockrill/session-golden.json via createPublisher)
3. Run `npx vite-node src/ideation/demodrive/cli.ts capture --script demodrive-script.json --data-source mock --out assets/demodrive --fast --full-page` exit 0, writes assets/demodrive/*.png and assets/demodrive/index.html or similar.
4. Verify assets/demodrive contains at least one png >0 bytes.
5. Document weekly re-capture rule in plan and in docs/repackage.md or docs/video-shotlist.md: "Capture early — in week 3, not the final week — and re-capture weekly. State that it is insurance, and insurance bought late is worthless." Schedule: week 3 first capture, then every Monday re-capture until submission.
```

### A10 deck→PDF + cover.png 1920×1080 (WU-PITCH-10)

```
1. Export deck to PDF: either deckgen has export flag, or manual: open deck/index.html in Chrome --headless --print-to-pdf deck/mockrill-deck.pdf . Pin command: `npx vite-node src/ideation/deckgen/cli.ts populate ...` already produced deck/; then `npx --yes puppeteer print deck/index.html deck/mockrill-deck.pdf` or `chromium --headless --print-to-pdf=deck/mockrill-deck.pdf deck/index.html`. Plan fixes to: use Chrome headless print; alternative mmdc-style puppeteer is acceptable but must produce deck/mockrill-deck.pdf >0 bytes and be PDF magic %PDF.
2. Cover: derived from deck slide 01, PNG 16:9 1920×1080. Create assets/cover.png: screenshot slide 01 at 1920×1080 viewport (or export via demodrive capture with 1920×1080 viewport). Command: `npx vite-node src/ideation/demodrive/cli.ts capture --script demodrive-script.json --data-source mock --out assets --fast --full-page` with viewport 1920x1080, or `npx sharp` resize, or manual screenshot.
3. Verify: `file assets/cover.png` must contain "PNG"; dimension check: `identify -format "%w %h" assets/cover.png` (ImageMagick) must print "1920 1080", fallback `npx vite-node -e "import {imageSize} from 'image-size';"` or `python -c "from PIL import Image; print(Image.open('assets/cover.png').size)"` prints (1920, 1080). Aspect 16:9 is 1920/1080 = 1.777...
4. Verify PDF: `file deck/mockrill-deck.pdf` must contain "PDF"; `wc -c deck/mockrill-deck.pdf` >0.
```

### A11 video-shotlist + rehearsals (WU-PITCH-11)

`docs/video-shotlist.md` shot-by-shot with mm:ss matching script.md. Normative structure:
```md
# Video Shotlist — Mockrill 4:00 (matches script.md)
Total 4:00; opens on ticking transcript 00:00-00:10; demo shows real spoken session; DEMODRIVE capture substitute only if live fails.
| mm:ss | Shot | On screen | Said (approx) |
|---|---|---|---|
|00:00-00:10|1 Hook|Ticking transcript streaming (words + timestamps)|"This is a real interview ..."|
|00:10-00:35|2 Problem|Split: freeze + filler montage|"The spoken screen freezes you..."|
|00:35-01:05|3 User+Product|User persona + one-sentence product|"For bootcamp grads..."|
|01:05-01:35|4 How it works|Architecture.png diagram|S4 flow|
|01:35-02:05|5 AssemblyAI|Code snippet literal params|Params verbatim|
|02:05-03:10|6 Demo|Real spoken session LiveCall→Scorecard→Drill|Live mic; DEMODRIVE fallback noted|
|03:10-03:35|7 Business|TAM arithmetic table|Bottom-up numbers|
|03:35-03:50|8 Originality+Next|Prior art + re-drill loop|Differentiator|
|03:50-04:00|9 Close|Disclosure + URL + MIT|"Try it at ..."|
Rehearsals: two timed to ≤5:00 (use stopwatch or `npx vite-node src/ideation/script/cli.ts generate` word-count * 140 wpm check). DEMODRIVE is substitute only if live capture fails on recording day.
```
Algorithm:
```
1. Write docs/video-shotlist.md with table above; ensure mm:ss marks sum to 4:00 and match script.md sections.
2. Include rule verbatim: demo segment shows a real spoken session, and DEMODRIVE capture is the substitute only if live capture fails on recording day.
3. Two rehearsals: record or time reading script.md aloud twice; each run ≤5:00 (300s). Log times in shotlist footer: Rehearsal 1: mm:ss, Rehearsal 2: mm:ss.
```

## §6 Configuration, environment & files

### Env vars

| Name | Who reads it | Default | What happens when missing |
|---|---|---|---|
| `ASSEMBLYAI_API_KEY` | `api/aai-token.ts`, `api/turn.ts` server-only | (no default) | `GET /api/aai-token` returns 503 degraded; DEMODRIVE mock still works; pitch artifacts still shippable offline |
| `MOCKRILL_LLM_MODEL` | `api/turn.ts` | `claude-sonnet-4-6` | Falls back to primary |
| `MOCKRILL_LLM_FALLBACK_MODEL` | `api/turn.ts` | `qwen3.5-4b-32k-fast` | Fallback model for LLM Gateway |
| `PUBLIC_URL` | `submission.md` field 10, README, deck slide 12 | `https://<app>.vercel.app` after DP-DEPLOY | Deck slide 12 placeholder until deploy |
| No new env vars owned by DP-PITCH | — | — | DP-PITCH reads no secret |

Only one runtime secret `ASSEMBLYAI_API_KEY` read only inside `api/*.ts` (S3 constraint 7) — never in pitch scripts.

### Config files

- `assembly.manifest.json` read-only (includes resilience,platform,context,ideation,provenance)
- `winning_project_plan.md` read-only (grounded:false, tam_figure:[figure to pin down])
- `disclosure.md` + `architecture-summary.md` generated by DP-SUBMIT, consumed by deckgen/faqdef
- `docs/architecture.mmd` / `.png` (M45) embedded in slide 06
- `my-timing.yaml` (CREATE, repo root, authored fresh — examples/ git-ignored)
- `demodrive-script.json` (CREATE, repo root)
- Chassis CLIs read-only: `src/ideation/deckgen/cli.ts`, `src/ideation/script/cli.ts`, `src/ideation/faqdef/cli.ts`, `src/ideation/demodrive/cli.ts`

### Complete file map — everything this plan creates or edits

| Path | Action | Description |
|---|---|---|
| `private/design_documents/design_plans/DP-PITCH.md` | **CREATE** | This plan |
| `disclosure.md` | **READ** (prereq) | DP-SUBMIT generated; must exist before WU-PITCH-01 |
| `architecture-summary.md` | **READ** (prereq) | DP-SUBMIT generated |
| `deck/` | **CREATE** (directory) | deckgen populate --no-llm output (slide markdown/HTML) |
| `deck/mockrill-deck.pdf` | **CREATE** | Exported PDF for submission field 7 |
| `my-timing.yaml` | **CREATE** | Full timing config 4:00 (authored fresh) |
| `script.md` | **CREATE** | Generated timed script 4:00 |
| `docs/qa/qa-sheet.md` | **CREATE** | faqdef generate output + five verbatim answers |
| `demodrive-script.json` | **CREATE** | DEMODRIVE click sequence JSON |
| `assets/demodrive/` | **CREATE** (directory) | capture output pngs/html (fallback-ladder rung 3) |
| `assets/cover.png` | **CREATE** | PNG 16:9 1920×1080 from deck slide 01 |
| `docs/video-shotlist.md` | **CREATE** | Shot-by-shot mm:ss matching script.md |

No edits to chassis: `src/resilience/`, `src/platform/`, `src/context/`, `src/ideation/`, `src/provenance/`, `contracts/`, `assembly.manifest.json` are read-only. No `src/media`, `src/cost`, `src/dev`, `src/pgm`, `src/profile`.

## §7 Failure & degradation behavior

| # | Failure | Detection | DegradedResult reason / exit code | What user sees | Fallback-ladder rung |
|---|---|---|---|---|---|
| F-PITCH-01 | disclosure.md missing at WU-PITCH-00 | `test -f disclosure.md` exits 1 | CLI exit 1; plan STOP | Stop and run DP-SUBMIT first | Docs hygiene gate |
| F-PITCH-02 | architecture-summary.md missing | `test -f architecture-summary.md` exits 1 | CLI exit 1 | Stop and run DP-SUBMIT | Docs gate |
| F-PITCH-03 | deckgen populate fails (missing disclosure) | `npx vite-node src/ideation/deckgen/cli.ts populate ... --no-llm` exit non-0 | exit 1 | Console error; deck/ not written | — |
| F-PITCH-04 | script validate fails (total !=4:00) | `script validate --config my-timing.yaml` exit 1 | exit 1 first line contains "invalid"/"mismatch" | Fix my-timing.yaml durations to sum 4:00 | — |
| F-PITCH-05 | script generate without validated timing | generate exit 1 | exit 1 | Re-run validate first | — |
| F-PITCH-06 | faqdef generate missing disclosure | CLI exit 1 | exit 1 | Ensure disclosure.md exists | — |
| F-PITCH-07 | demodrive validate fails (bad JSON/selector) | `demodrive validate --script demodrive-script.json` exit 1 | exit 1 invalid | Fix JSON per §5 A8 | Rung 3 |
| F-PITCH-08 | demodrive capture fails (dev not running, mock:publish not running) | capture exit 1 or 0 bytes png | exit 1 or empty out | Start `npm run dev` + `npm run mock:publish` then re-capture | Rung 3 — insurance |
| F-PITCH-09 | cover.png wrong dimensions (not 1920x1080) | `identify -format "%w %h" assets/cover.png` != "1920 1080" | artifact check fail | Re-export from slide 01 at correct viewport | Field 5 gate |
| F-PITCH-10 | deck PDF not PDF magic | `file deck/mockrill-deck.pdf` missing "PDF" | artifact check fail | Re-export via puppeteer print | Field 7 gate |
| F-PITCH-11 | video rehearsal >5:00 | `docs/video-shotlist.md` rehearsal log >300s | manual timing fail | Trim script or speak faster; re-time | — |

Pitch has no `withResilience` wrapping — failures are CLI non-zero exits or artifact assertions; any network call inside CLIs already wrapped per S3 constraint 4 with `{timeout_ms:15000,retries:1,fallback_chain:{order:["cache","none"]}}`.

## §8 Public surface & import rules

### What is exported (public surface)

- `deck/` directory + `deck/mockrill-deck.pdf` (submission field 7 PDF mandatory) — referenced by `submission.md` field 7 and lablab upload
- `script.md` at repo root — supports submission field 6 video (3-5 min)
- `docs/qa/qa-sheet.md` — judge Q&A sheet + five verbatim answers
- `demodrive-script.json` + `assets/demodrive/` — fallback-ladder rung 3 insurance capture
- `assets/cover.png` — submission field 5 PNG 16:9 1920×1080 derived from slide 01
- `docs/video-shotlist.md` — shot-by-shot with mm:ss matching script.md
- `my-timing.yaml` — timing config (internal, not submitted)

No TS barrel — DP-PITCH owns markdown/PNG/PDF/JSON/YAML artifacts, not TS exports.

### What is internal

- `private/design_documents/design_plans/DP-PITCH.md` (this plan, git-ignored after DP-SUBMIT .gitignore private/ line)
- CLI invocations via `npx vite-node` — not wrapped or re-exported

### Import rules (binding)

1. DP-PITCH MUST NOT edit `src/resilience/`, `src/platform/`, `src/context/`, `src/ideation/`, `src/provenance/`, `contracts/`, `assembly.manifest.json` — chassis read-only.
2. MUST NOT create `src/media`, `src/cost`, `src/dev`, `src/pgm`, `src/profile`, `src/assembly` — excluded and absent.
3. MUST NOT import CLIs as TS modules; invoke only via `npx vite-node <path> <command> --plan --manifest ...`.
4. MUST NOT read `ASSEMBLYAI_API_KEY` — only `api/*.ts` (server side) reads it.
5. Consumers MUST reference pitch artifacts from paths shown; re-defining them elsewhere is a defect.
6. `disclosure.md` is generated by DP-SUBMIT (provo generate); DP-PITCH only reads it, never hand-writes it.

## §9 Work units

### WU-PITCH-00 — Prerequisite gate: verify disclosure.md + architecture-summary.md exist

- **Goal:** Gate — ensure DP-SUBMIT completed before pitch work; if missing stop and do not hand-write.
- **Depends on:** DP-SUBMIT (provo generate + summary)
- **Files touched:** (none — checks only) reads `disclosure.md`, `architecture-summary.md`
- **Implementation steps:**
  1. `test -f disclosure.md` — exit 0 required.
  2. `test -f architecture-summary.md` — exit 0 required.
  3. `head -n1 disclosure.md` contains Disclosure/Provenance.
  4. `grep -c "resilience" architecture-summary.md` >=1.
  5. If either missing, STOP and echo "Run DP-SUBMIT first".
- **Verification command:**
  ```sh
  test -f disclosure.md && echo "disclosure:exists" && test -f architecture-summary.md && echo "summary:exists"
  ```
- **Expected output (exact):**
  ```
  disclosure:exists
  summary:exists
  ```
  Exit 0. If missing, command exits 1 and plan stops.
- **Done-when:** Both files exist, gate prints two lines, next WU may proceed.

### WU-PITCH-01 — deckgen populate --no-llm → deck/

- **Goal:** Offline-shippable deck from winning_project_plan.md + manifest + disclosure without LLM.
- **Depends on:** WU-PITCH-00
- **Files touched:** `deck/` (CREATE directory + slides)
- **Implementation steps:**
  1. Ensure disclosure.md exists (WU-PITCH-00).
  2. Run `npx vite-node src/ideation/deckgen/cli.ts populate --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out deck/ --no-llm`
  3. Verify `ls deck/` exits 0 and contains at least one file.
  4. Optional polish pass: re-run without --no-llm (not required for shippable).
  5. Run validate if available: `npx vite-node src/ideation/deckgen/cli.ts validate --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out deck/`
- **Verification command:**
  ```sh
  npx vite-node src/ideation/deckgen/cli.ts populate --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out deck/ --no-llm && echo "populate:ok" && ls deck/ | head -n1
  ```
- **Expected output (exact first line):**
  ```
  populate:ok
  ```
  Plus `ls` prints first deck file name (e.g. `slides.md` or `index.html`). Exit 0.
- **Done-when:** deck/ exists, populate --no-llm exit 0, offline output shippable; print "populate:ok".

### WU-PITCH-02 — Business-value slide with bottom-up TAM arithmetic

- **Goal:** Slide 05 B2C+B2B with TAM shown as bottom-up estimate, every input cited or [estimate], arithmetic visible, grounded:false honored.
- **Depends on:** WU-PITCH-01
- **Files touched:** `deck/` (EDIT slide 05)
- **Implementation steps:**
  1. Locate slide 05 in deck/ (e.g. `deck/slides.md` section 05 or `deck/slide-05.md`).
  2. Replace or ensure slide 05 body contains the bottom-up table from §5 A2 with every input labelled [estimate] or citation and the arithmetic `36,000 * $19 *3 = $2.05M`, `500*20*499=$4.99M`, `~$7M ARR`, `SAM ~$700k`.
  3. Add footer caption verbatim: "No pgm/profile grounding available — inputs labelled [estimate]; arithmetic shown."
  4. Ensure slide job = business value, axis = Business Value.
- **Verification command:**
  ```sh
  grep -c "\[estimate\]" deck/slides.md 2>/dev/null || grep -c "\[estimate\]" deck/slide-05.md 2>/dev/null || grep -R "\[estimate\]" deck/ | wc -l
  ```
- **Expected output (exact):**
  ```
  5
  ```
  (or >=5) At least 5 [estimate] markers present. Exit 0. Alternative check: `grep -c "\$7M" deck/slides.md` >=1.
- **Done-when:** Slide 05 contains [estimate] per input, arithmetic visible, caption present, $7M figure not invented as TAM without arithmetic.

### WU-PITCH-03 — AssemblyAI-usage slide with literal parameters

- **Goal:** Slide 07 shows Universal-3.5-Pro streaming with literal params plus LLM Gateway JSON-Schema tool calling.
- **Depends on:** WU-PITCH-01
- **Files touched:** `deck/` (EDIT slide 07)
- **Implementation steps:**
  1. Locate slide 07 in deck/.
  2. Ensure slide contains verbatim literals: `format_turns`, `keyterms_prompt`, `end_of_turn_confidence_threshold`, `vad_threshold`, `interruption_delay`, `speech_model`, `universal-3-5-pro`, `sample_rate`, `encoding pcm_s16le`, `wss://streaming.assemblyai.com/v3/ws`, `GET https://streaming.assemblyai.com/v3/token`, `expires_in_seconds`, `POST https://llm-gateway.assemblyai.com/v1/chat/completions`, `tools`, `tool_choice`, `speechSynthesis`.
  3. Ensure axis = Application of Technology.
- **Verification command:**
  ```sh
  grep -c "format_turns" deck/slides.md 2>/dev/null || grep -R "format_turns" deck/ | wc -l
  ```
- **Expected output (exact):**
  ```
  1
  ```
  (>=1) Also `grep -c "keyterms_prompt" deck/slides.md` >=1 and `grep -c "end_of_turn_confidence_threshold" deck/slides.md` >=1 and `grep -c "llm-gateway.assemblyai.com" deck/slides.md` >=1. Exit 0.
- **Done-when:** Slide 07 contains all literal params verbatim, axis labeled Application of Technology.

### WU-PITCH-04 — my-timing.yaml (full contents) + script validate passing

- **Goal:** Author timing file fresh (examples/ git-ignored), total 4:00, opens on ticking transcript not title.
- **Depends on:** WU-PITCH-00
- **Files touched:** `my-timing.yaml` (CREATE at repo root)
- **Implementation steps:**
  1. Write my-timing.yaml with exact YAML from §5 A4 (total "4:00", sections with durations summing 240s, first 00:10 hook_transcript_open).
  2. Run `npx vite-node src/ideation/script/cli.ts validate --plan winning_project_plan.md --manifest assembly.manifest.json --config my-timing.yaml`
  3. Must exit 0; first output line contains valid/ok/pass.
- **Verification command:**
  ```sh
  npx vite-node src/ideation/script/cli.ts validate --plan winning_project_plan.md --manifest assembly.manifest.json --config my-timing.yaml && echo "validate:ok"
  ```
- **Expected output (exact last line):**
  ```
  validate:ok
  ```
  Plus validator first line contains "valid" or "ok" or "pass". Exit 0.
- **Done-when:** my-timing.yaml at repo root contains total 4:00 and 9 sections; script validate exits 0; opening 10s is transcript.

### WU-PITCH-05 — script generate → script.md at 4:00

- **Goal:** Generate timed script 4:00 opening on ticking transcript.
- **Depends on:** WU-PITCH-04
- **Files touched:** `script.md` (CREATE at repo root)
- **Implementation steps:**
  1. Run `npx vite-node src/ideation/script/cli.ts generate --plan winning_project_plan.md --manifest assembly.manifest.json --config my-timing.yaml --out script.md`
  2. Verify script.md exists, contains "4:00" and "transcript" in first 500 chars.
- **Verification command:**
  ```sh
  npx vite-node src/ideation/script/cli.ts generate --plan winning_project_plan.md --manifest assembly.manifest.json --config my-timing.yaml --out script.md && echo "generate:ok" && head -n5 script.md | cat
  ```
- **Expected output (exact contains):**
  ```
  generate:ok
  ```
  Plus `head -n1 script.md` contains Script or Mockrill. Exit 0. `grep -c "4:00" script.md` >=1.
- **Done-when:** script.md exists at 4:00, opens on transcript, per-section budgets match my-timing.yaml.

### WU-PITCH-06 — faqdef generate + five verbatim answers

- **Goal:** Q&A sheet via generate plus five judge-deciding verbatim answers.
- **Depends on:** WU-PITCH-00
- **Files touched:** `docs/qa/qa-sheet.md` (CREATE)
- **Implementation steps:**
  1. Run `npx vite-node src/ideation/faqdef/cli.ts generate --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out docs/qa`
  2. Verify docs/qa/qa-sheet.md exists.
  3. Append verbatim answers section with exact five texts from §5 A6 if not already generated containing them; ensure each contains the key phrases listed.
- **Verification command:**
  ```sh
  npx vite-node src/ideation/faqdef/cli.ts generate --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out docs/qa && echo "faqdef:ok" && wc -l docs/qa/qa-sheet.md
  ```
- **Expected output (exact contains):**
  ```
  faqdef:ok
  ```
  Plus `wc -l` >20. Exit 0. `grep -c "Why is this AssemblyAI" docs/qa/qa-sheet.md` >=1 and `grep -c "re-drill" docs/qa/qa-sheet.md` >=1.
- **Done-when:** docs/qa/qa-sheet.md exists, contains generated questions plus five verbatim answers with literal socket params and deterministic evidence language.

### WU-PITCH-07 — faqdef rehearse --count 5 --budget 90 twice

- **Goal:** Two rehearse runs with count 5 budget 90.
- **Depends on:** WU-PITCH-06
- **Files touched:** (none new; reads docs/qa/qa-sheet.md)
- **Implementation steps:**
  1. Run `npx vite-node src/ideation/faqdef/cli.ts rehearse --qa docs/qa/qa-sheet.md --count 5 --budget 90` — exit 0.
  2. Run same command a second time — exit 0.
- **Verification command:**
  ```sh
  npx vite-node src/ideation/faqdef/cli.ts rehearse --qa docs/qa/qa-sheet.md --count 5 --budget 90 && echo "rehearse1:ok" && npx vite-node src/ideation/faqdef/cli.ts rehearse --qa docs/qa/qa-sheet.md --count 5 --budget 90 && echo "rehearse2:ok"
  ```
- **Expected output (exact last lines):**
  ```
  rehearse1:ok
  rehearse2:ok
  ```
  Plus rehearsal output first line contains rehearsed/rehearse/pass/budget. Exit 0.
- **Done-when:** Two rehearse runs both exit 0 with count 5 budget 90.

### WU-PITCH-08 — demodrive-script.json + validate

- **Goal:** Click sequence Setup→LiveCall→ScorecardView→Drill with full JSON and validate pass.
- **Depends on:** none (but capture needs dev+mock)
- **Files touched:** `demodrive-script.json` (CREATE at repo root)
- **Implementation steps:**
  1. Write demodrive-script.json with exact JSON from §5 A8 (Setup→LiveCall→ScorecardView→Drill, 1280×720 viewport, fullPage true).
  2. Run `npx vite-node src/ideation/demodrive/cli.ts validate --script demodrive-script.json` exit 0.
- **Verification command:**
  ```sh
  npx vite-node src/ideation/demodrive/cli.ts validate --script demodrive-script.json && echo "demodrive-validate:ok"
  ```
- **Expected output (exact last line):**
  ```
  demodrive-validate:ok
  ```
  Plus validator first line contains valid/ok/pass. Exit 0.
- **Done-when:** demodrive-script.json exists with 12 steps, validate exit 0.

### WU-PITCH-09 — demodrive capture (week 3) + weekly re-capture rule

- **Goal:** Early insurance capture in week 3 and weekly re-capture; DEMODRIVE is fallback-ladder rung 3.
- **Depends on:** WU-PITCH-08, DP-DEMOPROOF (mock:publish + session-golden.json), DP-DEPLOY (dev/preview)
- **Files touched:** `assets/demodrive/` (CREATE directory + pngs)
- **Implementation steps:**
  1. Terminal 1: `npm run dev` (or `npm run preview -- --port 4173`).
  2. Terminal 2: `npm run mock:publish` (SSE :8787).
  3. Run `npx vite-node src/ideation/demodrive/cli.ts capture --script demodrive-script.json --data-source mock --out assets/demodrive --fast --full-page` exit 0.
  4. Verify `ls assets/demodrive/` contains png.
  5. Document rule in this plan and in docs/video-shotlist.md footer: "Capture early — in week 3, not the final week — and re-capture weekly. Insurance bought late is worthless." Schedule: week 3 first, every Monday until Sep 24/30.
- **Verification command:**
  ```sh
  npx vite-node src/ideation/demodrive/cli.ts capture --script demodrive-script.json --data-source mock --out assets/demodrive --fast --full-page && echo "capture:ok" && ls assets/demodrive | head -n3
  ```
- **Expected output (exact contains):**
  ```
  capture:ok
  ```
  Plus `ls` prints png/html files. Exit 0. Requires dev+mock running; if not, capture fails exit 1 (see F-PITCH-08).
- **Done-when:** assets/demodrive contains png >0 bytes; weekly re-capture rule stated verbatim in plan.

### WU-PITCH-10 — deck → PDF export and assets/cover.png at 1920×1080

- **Goal:** deck/mockrill-deck.pdf PDF mandatory + assets/cover.png PNG 16:9 1920×1080 from slide 01.
- **Depends on:** WU-PITCH-01, WU-PITCH-09 (or at least deck/ exists)
- **Files touched:** `deck/mockrill-deck.pdf` (CREATE), `assets/cover.png` (CREATE)
- **Implementation steps:**
  1. Export deck to PDF: `npx --yes puppeteer print deck/index.html deck/mockrill-deck.pdf` or Chrome headless `chromium --headless --print-to-pdf=deck/mockrill-deck.pdf deck/index.html` — must produce PDF %PDF header >0 bytes.
  2. Create cover: screenshot slide 01 at 1920×1080 viewport (adjust puppeteer viewport) to assets/cover.png; or resize existing png to 1920×1080.
  3. Verify PDF: `file deck/mockrill-deck.pdf` contains PDF.
  4. Verify cover: `identify -format "%w %h" assets/cover.png` prints "1920 1080"; fallback `file assets/cover.png` contains PNG.
- **Verification commands:**
  ```sh
  file deck/mockrill-deck.pdf | grep -i pdf && echo "pdf:ok"
  ```
  ```sh
  identify -format "%w %h" assets/cover.png 2>/dev/null || file assets/cover.png | grep -i png && echo "cover:ok"
  ```
- **Expected output (exact):**
  ```
  pdf:ok
  cover:ok
  ```
  First command grep must show PDF; second must show PNG and dimensions 1920 1080 if ImageMagick available, else PNG check. Both exit 0. `wc -c deck/mockrill-deck.pdf` >0.
- **Done-when:** deck/mockrill-deck.pdf is PDF >0 bytes; assets/cover.png is PNG 1920×1080 16:9 derived from slide 01.

### WU-PITCH-11 — docs/video-shotlist.md + two rehearsals timed to ≤5:00

- **Goal:** Shot-by-shot mm:ss matching script.md, demo shows real spoken session with DEMODRIVE fallback only if live fails, plus two timed rehearsals ≤5:00.
- **Depends on:** WU-PITCH-05, WU-PITCH-09
- **Files touched:** `docs/video-shotlist.md` (CREATE)
- **Implementation steps:**
  1. Write docs/video-shotlist.md with table from §5 A11 (9 shots mm:ss summing 4:00 matching script.md sections).
  2. Include rule verbatim: "The demo segment shows a real spoken session, and the DEMODRIVE capture is the substitute only if live capture fails on recording day."
  3. Two rehearsals: read script.md aloud twice timed; log in file footer e.g. "Rehearsal 1: 03:58 — pass (≤5:00)" and "Rehearsal 2: 04:02 — pass".
  4. Include insurance sentence: "Capture early — in week 3, not the final week — and re-capture weekly."
- **Verification command:**
  ```sh
  test -f docs/video-shotlist.md && echo "shotlist:exists" && grep -c "mm:ss" docs/video-shotlist.md && grep -c "DEMODRIVE" docs/video-shotlist.md
  ```
- **Expected output (exact):**
  ```
  shotlist:exists
  1
  1
  ```
  (counts >=1) Plus `grep -c "03:50-04:00" docs/video-shotlist.md` >=1 and rehearsal lines contain "Rehearsal 1" and "Rehearsal 2". Exit 0. Manual timing check: both rehearsals ≤5:00 (300s).
- **Done-when:** docs/video-shotlist.md exists with 9 shots mm:ss matching script.md, DEMODRIVE fallback rule verbatim, two rehearsals logged ≤5:00.

## §10 Acceptance criteria

| # | Requirement | WU | Check |
|---|---|---|---|
| R-PITCH-01 | Prerequisite gate disclosure + summary exist | WU-PITCH-00 | `test -f disclosure.md && test -f architecture-summary.md` both exit 0 |
| R-PITCH-02 | Deck 12 slides order + judging axis each | WU-PITCH-01 + 02 + 03 | deck/ exists; slide 01 title hook, 02 problem, 03 specific user, 04 product, 05 TAM, 06 arch, 07 AssemblyAI, 08 originality, 09 re-drill, 10 demo, 11 next, 12 disclosure |
| R-PITCH-03 | TAM honesty bottom-up arithmetic visible | WU-PITCH-02 | grep [estimate] >=5 and $7M + SAM $700k arithmetic on slide 05 |
| R-PITCH-04 | AssemblyAI slide literal params | WU-PITCH-03 | grep format_turns, keyterms_prompt, end_of_turn_confidence_threshold, vad_threshold, interruption_delay, llm-gateway present |
| R-PITCH-05 | my-timing.yaml 4:00 opens transcript | WU-PITCH-04 +05 | my-timing.yaml total 4:00; script validate exit 0; script.md opens transcript; generate:ok |
| R-PITCH-06 | faqdef generate + five verbatim answers | WU-PITCH-06 | docs/qa/qa-sheet.md exists; grep five question keys; verbatim answers contain deterministic detection / Path B serverless / mergeScores / B2C/B2B numbers / re-drill |
| R-PITCH-07 | rehearse twice count5 budget90 | WU-PITCH-07 | Two rehearse runs exit 0, rehearse1:ok rehearse2:ok |
| R-PITCH-08 | demodrive-script.json + validate | WU-PITCH-08 | demodrive-script.json 12 steps; validate exit 0 demodrive-validate:ok |
| R-PITCH-09 | demodrive capture week3 + weekly re-capture | WU-PITCH-09 | assets/demodrive png >0; plan states week3 + weekly rule verbatim |
| R-PITCH-10 | deck PDF + cover 1920×1080 | WU-PITCH-10 | file deck/mockrill-deck.pdf contains PDF; identify assets/cover.png 1920 1080 |
| R-PITCH-11 | video-shotlist mm:ss + 2 rehearsals ≤5:00 | WU-PITCH-11 | docs/video-shotlist.md 9 shots 4:00 matching script.md; DEMODRIVE fallback rule; Rehearsal1/2 ≤5:00 |

Hard rule: every WU ends with ONE runnable verification command and exact expected output (S8). Total script 4:00 inside 3-5 min band with 1 min margin both ends. Video opens on ticking transcript not title — first 10 seconds decide Presentation score.

## §11 Non-goals

- No new TS contracts or M-number exports — DP-PITCH owns artifacts only; all TS types owned by DP-CONTRACTS/others and imported.
- No `withResilience` wrapping owned — pitch CLIs are pure/offline; network calls inside CLIs already wrapped per S3.
- No `ASSEMBLYAI_API_KEY` reading or serverless function creation — owned by DP-AAI-STREAM/DP-INTERVIEWER/DP-DEPLOY.
- No LLM-generated deck without --no-llm baseline — offline output must be shippable first; LLM polish is optional second pass.
- No invented TAM big number — bottom-up honest estimate with [estimate] labels is required; grounded:false and pgm/profile excluded.
- No invention of `src/media`, `src/cost`, `src/dev`, `src/pgm`, `src/profile` modules or `scripts/mock-publish.ts` import.
- No code files — this plan authors artifacts via CLIs; weak model executes literally per S8.
- No hosting or health endpoint work — owned by DP-DEPLOY (vercel.json, api/health.ts, PUBLIC_URL).

## §12 Open questions

| # | Question | Safe default chosen by this plan |
|---|---|---|
| Q1 | winning_project_plan.md TAM inputs not yet cited — where to get 90k/150k/500 figures? | Use the example bottom-up numbers in §5 A2 labelled [estimate] unless operator provides cited Course Report or bootcamp data; arithmetic shape stays same |
| Q2 | deckgen CLI output shape varies (slides.md vs index.html) — how to edit slide 05/07 reliably? | Check deck/index.html, deck/slides.md, or deck/slide-*.md — edit whichever exists; verification grep uses fallback chain deck/slides.md || deck/slide-05.md || grep -R deck/ |
| Q3 | PDF export tool not preinstalled (puppeteer/chromium) | Plan fixes to puppeteer print via `npx --yes puppeteer` or Chrome headless; if unavailable fallback to `npx vite-node src/ideation/deckgen/cli.ts` if it has --pdf flag, else manual browser print; must still produce PDF magic |
| Q4 | cover.png dimension check needs ImageMagick | Primary check `identify -format "%w %h" assets/cover.png` = "1920 1080"; fallback `file assets/cover.png` + Python PIL `Image.open().size` == (1920,1080) |
| Q5 | examples/ timing template git-ignored so author fresh — validate total? | Plan authors my-timing.yaml from scratch per §5 A4; total must be "4:00" exactly; validate must exit 0 |
| Q6 | DEMODRIVE capture needs dev+mock:publish running simultaneously — how to verify in CI? | Document requires two terminals (npm run dev in terminal1, npm run mock:publish in terminal2); verification command assumes they are running; capture early week 3 and weekly re-capture reduces flakiness |
| Q7 | faqdef/ideation CLIs may not exist verbatim in assembled copy? | Invoke via `npx vite-node src/ideation/<tool>/cli.ts` as per S6; if CLI help differs, map flags to closest (`--plan`, `--manifest`, `--config`, `--out`); never stub CLI |
| Q8 | Video rehearsal timing manual? | Time reading script.md aloud with stopwatch; log mm:ss in docs/video-shotlist.md footer; both must be ≤5:00 (300s) and close to 4:00 |

**Blueprint gap:** none — S1-S10 provide all required inputs. If a chassis CLI flag differs at runtime, log the actual help and map to this plan's verbatim command rather than inventing a flag.

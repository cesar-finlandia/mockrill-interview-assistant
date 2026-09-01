# hackathon_brief.md — 2026-09 AssemblyAI Voice Agent Hackathon (lablab.ai)

> **Provenance — DEFINITIVE kickoff-day version:** transcribed on **2026-09-01 (Tue, kickoff day)** from https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon and its live dashboard https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon/live — all tabs read as rendered via lablab's stack (About, Challenge, Prizes, Judging Criteria, Event Schedule, Community & Social Channels, Speakers) plus binding linked pages: lablab.ai Hackathon Rule Book (`/hackathon-rules`), lablab.ai Guide (`/guide`), Getting Started Guide (`/getting-started-guide`), Submission Guidelines (`/delivering-your-hackathon-solution`), Terms of Use §16 Participation Terms, AssemblyAI Voice Agent API docs (`https://www.assemblyai.com/docs/voice-agents/voice-agent-api`), Realtime STT docs (`https://www.assemblyai.com/docs/streaming/getting-started/transcribe-streaming-audio`), LLM Gateway docs, AssemblyAI GitHub quickstarts, and AssemblyAI YouTube playlist (all as listed under "Resources" on the event page). Live-dashboard counters and "Tracks: TBA" banner re-checked via websearch on 2026-09-01. Items marked `[unconfirmed]` were NOT published on any tab/link as of this transcription — the page itself still says *"Additional information about builder access and the challenge will be shared as it becomes available."* Re-check Discord Q&A (Tue Sep 1 16:00 UTC) and the Twitch kickoff stream (15:00 UTC) for any verbal addenda.
>
> Purpose: single paste-input for `src/profile` (Event Profile Extractor) and `src/pgm` (Problem Grounding Engine), per TU16 (`docs/tutorials/TU16-mock-hackathon-walkthrough.md`). See `docs/tutorials/README.md` for the TU01–TU15 index.

---

# AssemblyAI – Voice Agent Hackathon — Official Brief

**The fastest path to a working voice agent**

🌎 Online Hackathon · 💻 Month-long challenge · 📅 September 1–30, 2026 · 🏆 $10,000 prize pool ($5k cash + $5k in AAI credits)

A month-long online challenge run by lablab.ai together with **AssemblyAI**, the Voice AI infrastructure company for builders. Every participant builds on AssemblyAI. A month is long enough to build something that actually runs, and short enough to keep momentum — take an idea from an empty repo to a working voice agent. You can join at any point. Registration stays open for the entire build window; only the submission deadline is the same for everyone. Fully online — build from anywhere.

You can join at any point — registration stays open for the whole build window, so you can start on day one or pick the project up halfway through and still submit. Company email encouraged at registration/submission (helps AssemblyAI understand who is building); personal emails absolutely welcome.

## The challenge — summary (see §4 for verbatim)

Build a voice agent using AssemblyAI's real-time voice AI technology via one of two published paths (end-to-end Voice Agent API or bring-your-own-orchestration Realtime STT API) — see §4 for verbatim.

## Prizes — summary (see §2 table below for full list)

$10,000 total — 5 winners × $1,000 cash + $1,000 in AssemblyAI API credits — see §2.

## Event schedule — summary (see §2 for full table with UTC+GST)

Kickoff Tue Sep 1 15:00 UTC → Submissions close Wed Sep 30 15:00 UTC — see §2.

## Teams & participation — summary (see §2)

Teams 1–6 (solo allowed, boilerplate-flagged `[unconfirmed]`); fully online; register on lablab.ai *and* Discord — see §2.

## What to submit — summary (see §2 for exact 10-field checklist)

10 fields via the lablab.ai event page (title, descriptions, tags, cover image, video, slides, GitHub repo, hosting platform, application URL) — see §2.

## Judging criteria — summary (see §2 for table)

Four axes: Application of Technology, Presentation, Business Value, Originality (weights `[unconfirmed]`) — see §2.

## Rules highlights — summary (see §4 for verbatim)

Every project must be built on AssemblyAI; original & MIT-compliant; read the linked Guidelines/Rule Book before submitting — see §4 for verbatim.

---

## 1. At-a-glance facts

| Fact | Value |
|---|---|
| **Event** | AssemblyAI – Voice Agent Hackathon |
| **Tagline (quoted)** | *"The fastest path to a working voice agent"* |
| **Format banner** | Online Hackathon \| Month-long challenge |
| **Dates** | **Mon Sep 1, 2026 15:00 UTC → Wed Sep 30, 2026 15:00 UTC** (19:00 GST, GMT+0400) — 29 days |
| **Organizers** | lablab.ai + AssemblyAI |
| **Prize pool** | **$10,000** — $5k cash + $5k in AssemblyAI credits (see §2) |
| **Live counters as of 2026-09-01** | **1,374 participants** (▲ +~250 today) · **302 teams** (▲ +72 today) · **0 submissions** · **1 draft in progress** · **Technologies in use: AgentOps (1)** · **Tracks: TBA / Announced soon** (live dashboard still shows "TBA") |
| **Prep-phase counters (2026-08-26)** | 395 participants, teams already forming — growth ~3.5× by kickoff |
| **Location** | Fully online — build from anywhere |
| **Kickoff stream** | Twitch https://www.twitch.tv/lablabai — 15:00 UTC kickoff, 16:00 UTC Discord Q&A |
| **Discord** | https://discord.gg/lablabai + https://discord.gg/lablab-ai-877056448956346408 (invite) |
| **Hashtag / share** | "Follow along live" share link on `/live` page |

## 2. Full confirmed facts

### Intro paragraph (as published, 2026-09-01)

> "A month-long online challenge run by lablab.ai together with AssemblyAI, the Voice AI infrastructure company for builders. Every participant builds on AssemblyAI. You can join at any point — registration stays open for the whole build window, so you can start on day one or pick the project up halfway through and still submit. 🌍 Fully online hackathon. Join and build from anywhere in the world."

> "✉️ Have a company email? If you have a company email, we encourage you to use it when registering or submitting your project. It helps us better understand who's building with AssemblyAI and share relevant opportunities after the hackathon. Personal emails are absolutely welcome."

### The challenge (one-line pointer)

> **See §4 for the full verbatim challenge / Path A / Path B text as published.** No additional tracks or sponsor sub-challenges are published on the event page as of 2026-09-01 — the live dashboard explicitly shows *Tracks: TBA / Announced soon*.

### Mandated technology + credits/keys (one-line pointer)

> **See §4 for verbatim mandated-tech and credit-claiming procedure.** Starter kits: Voice Agent API starter repos (Python 3.9+ / Node 18+) at `github.com/AssemblyAI/voice-agent-starter-python` and `-js`; `ASSEMBLYAI_API_KEY` in `.env`; optional MCP server + skill for AI coding agents. Credit amount behind the event's dedicated signup link is still `[unconfirmed]` on the event page — externally, AssemblyAI's public free tier is $50 on signup (see §4 note), but the event-granted bonus amount is unpublished.

### Official resources (as published, links on the event page under "Resources")

| Resource | Link |
|---|---|
| Docs hub | https://www.assemblyai.com/docs |
| Voice Agent API docs | https://www.assemblyai.com/docs/voice-agents/voice-agent-api |
| Realtime STT docs | https://www.assemblyai.com/docs/streaming/getting-started/transcribe-streaming-audio |
| LLM Gateway docs | https://www.assemblyai.com/docs/llm-gateway/quickstart |
| GitHub — quickstart guides | https://github.com/AssemblyAI |
| YouTube playlist | https://www.youtube.com/playlist?list=PLcWfeUsAys2m3vvl2lcBGuqJBC3-FcoHa |
| Voice Agent API starters | https://github.com/AssemblyAI/voice-agent-starter-python · https://github.com/AssemblyAI/voice-agent-starter-js |
| AssemblyAI llms.txt (discovery) | https://assemblyai.com/docs/llms.txt |
| AssemblyAI docs MCP | `https://assemblyai.com/docs/mcp` (add via `claude mcp add ...`) |
| Streaming endpoint (raw WS) | `wss://streaming.assemblyai.com/v3/ws` (Authorization: `<API_KEY>`; models e.g. `universal-3-5-pro`, `universal-streaming`) |
| Playground (no code) | https://www.assemblyai.com/dashboard/playground/voice-agent |

Also: `https://www.assemblyai.com/docs/streaming` (overview), message-sequence breakdown, WebSocket API reference, endpoints & data zones, temporary-token auth for browsers, troubleshooting guide — all linked from the docs above.

### Prizes

| Prize | Detail |
|---|---|
| **Total pool** | **$10,000** — **$5,000 cash + $5,000 in AssemblyAI API credits** |
| **Winners** | **5 winners**, each receiving **$1,000 cash + $1,000 in API credits** (winner cards 01–05 identical as published) |
| **Fine print (quoted)** | Participation voluntary; prizes/opportunities depend on eligibility, availability and third-party sponsors; rules/prizes/terms may change or be canceled at lablab's discretion; submissions must be **original and MIT-compliant**; prize distribution may take **up to 90 days**. Full details: `https://lablab.ai/terms-of-use#16-participation-terms` |
| **Sponsor sub-prizes** | None listed — `sponsors: []`, `eventPrizes: []` in the event record as of Sep 1 (`Tracks: TBA`). `[re-check at kickoff Q&A]` |

### Full schedule table (UTC + GST as published)

| When (UTC) | When (GST, GMT+0400, as published) | What |
|---|---|---|
| Tue 2026-09-01 15:00 | 19:00 | Hackathon Kick-off |
| Tue 2026-09-01 15:05 | 19:05 | lablab.ai Opening words |
| Tue 2026-09-01 15:10 | 19:10 | AssemblyAI Opening words |
| Tue 2026-09-01 15:15 | 19:15 | Introduction to the Challenge |
| Tue 2026-09-01 15:25 | 19:25 | Hackathon Guide |
| Tue 2026-09-01 16:00 | 20:00 | Discord Q&A session |
| **Wed 2026-09-30 15:00** | **19:00** | **End of Submissions! / Submissions close — Judging begins** |

Event record confirms `2026-09-01T15:00:00Z` → `2026-09-30T15:00:00Z`, `eventAttendanceMode: OnlineEventAttendanceMode`. Tutorials go live before the start; mentors are in Discord throughout. Registration closing is listed as *at kickoff* on the live page ("Registration closes the moment the event starts") — but the event intro also says "You can join at any point — registration stays open for the entire build window" `[contradiction — clarify in Discord Q&A at 16:00 UTC]`.

### Teams & participation rules

* Teams of **1–6 people** — this is lablab guideline boilerplate (page source marks it *"NOT confirmed for this event — check it"*) `[team cap unconfirmed; solo explicitly allowed via live-page/team-finder which lists solo teams]`
* Fully online — build from anywhere; everyone welcome regardless of prior AI/coding experience
* Register on **both** the lablab.ai platform (Enroll button) **and** the lablab.ai Discord server
* Team matching via the dashboard and Discord; live page shows 302 teams forming as of Sep 1, many with open slots
* Company email encouraged at registration/submission (helps AssemblyAI understand builders); personal emails welcome

### What to submit — EXACT 10-field checklist (via the lablab.ai event page)

📋 **Basic information**

1. Project title
2. Short description
3. Long description
4. Technology & category tags

📸 **Cover image and presentation**

5. Cover image — binding format from Rule Book: **PNG or JPG, 16:9 aspect ratio**
6. Video presentation `[length cap unconfirmed on the event page — see Rule Book note below; re-check kickoff]`
7. Slide presentation — binding format from Rule Book: **PDF** (mandatory)

💻 **App hosting and repository**

8. Public GitHub repository (mandatory — "for storing your code")
9. Demo application platform (where it is hosted) — Rule Book says "Application URL / demo link required (for interactive evaluation)" — so field 9 is the platform name and field 10 the URL
10. Application URL (hosted demo link — required for interactive evaluation per Rule Book; hosting is not optional in practice)

Binding formatting requirements (from `https://lablab.ai/hackathon-rules` / Submission Guidelines): cover image PNG/JPG 16:9; video MP4 and slide PDF are mandatory; GitHub repo mandatory; Application URL required. Presentation rubric: video "effectively communicates the problem, solution, and value proposition in **less than 5 min**" and penalizes videos under 3 min — **aim for the 3–5 minute band** (this is Rule Book rubric wording, not an event-page video cap). Manual submission available for 6 hours post-hackathon for those with valid reasons with prior organizer/mentor approval. For full guidance: `https://lablab.ai/delivering-your-hackathon-solution`.

> Copy of this checklist is formatted by `src/provenance/submit` (SUBMIT) from `winning_project_plan.md` + `assembly.manifest.json` + `disclosure.md` — auto-verifies 10 fields, secret-scan, and commit-distribution check before paste.

### Judging criteria (four axes — weights not published `[unconfirmed]`)

| Axis | What judges look for (event page + Rule Book top-band rubric summarized) |
|---|---|
| **Application of Technology** | How effectively the chosen model(s) — i.e., AssemblyAI — are integrated into the solution. Top band: *"exceptional application of AI technology through demo link, video & GitHub code … flawless technical implementation."* |
| **Presentation** | Clarity and effectiveness of the project presentation. Top band: *problem/solution/value communicated in <5 min, competitive analysis, flawless delivery.* |
| **Business Value** | Impact and practical value, fit into business areas. Top band: *"potential to disrupt the industry … clear sustainable revenue generation and long-term business success."* |
| **Originality** | Uniqueness and creativity; approaches and demonstrated behaviors. Top band: *"exceptionally original, transformative idea … completely new perspective."* |

Lablab standard practice is roughly equal quarters `[unconfirmed as a weight; not published on this event page]`. Sponsor-track criteria would apply only if sponsor sub-challenges are announced (none as of Sep 1).

### Rules highlights — one-line pointer

> **See §4 for verbatim rules excerpts.** Binding duties: AssemblyAI mandatory (either path), original & MIT-compliant, read Guidelines/Getting Started/Rule Book, plagiarism/vote-gaming = disqualification, organizers may participate but not win, prize terms may change, up to 90 days distribution. `[unconfirmed]` No explicit "disclose pre-built scaffolding / AI assistance" clause was found in the transcribed Rule Book text on this date — verify in a browser before relying on it (lablab norms allow non-AI scaffolding when core AI is built in-window).

---

## My annotations (NOT part of the official brief)

### Kickoff updates (2026-09-01) — what changed vs. prep version (2026-08-26)

**Transcription deltas:**
* Event-page copy unchanged — tagline, intro paragraph, Path A/B definitions, prize pool ($10k = 5 × $1k+$1k), schedule (Sep 1 15:00 UTC → Sep 30 15:00 UTC), 10-field submission list, four judging axes, and the "Additional information about builder access … will be shared" deferral are all identical to the 2026-08-26 prep transcription. No new track definitions, no sponsor sub-challenges, no video length cap, no judging-weight table, and no credit-amount figure were added by kickoff — live dashboard still reads *Tracks: TBA / Announced soon*.
* Live-dashboard counters moved materially: **1,374 participants (was 395 on 2026-08-26, +979)**, **302 teams (was ~109-ish, +~193)**, **Technologies in use: 1 (AgentOps)**, **0 submissions, 1 draft in progress**. Momentum confirms competitive density is now high — a PAS scan at Hour 0 is mandatory, not optional.
* "Registration closes at kickoff" wording appeared on the `/live` page's "Key milestones" card, contradicting the intro paragraph's "You can join at any point — registration stays open for the whole build window" — flagged as an open question for the 16:00 UTC Discord Q&A.
* AssemblyAI docs re-verified: Voice Agent API starters (Python/JS), MCP + skill, `universal-3-5-pro` / `universal-streaming` models, `wss://streaming.assemblyai.com/v3/ws`, temporary-token auth for browsers, and the full event sequence (`Begin` → `Turn` with `end_of_turn` + `turn_is_formatted` → `Termination`) are all live and unchanged.

**Where the prep-phase guess was right:**
* The *Mockrill* framing (realtime voice interview coach with timestamp-quoted scorecard) remains fully inside the brief's "Build a voice agent" frame — neither path excludes it; Path A (Voice Agent API single connection) still handles STT (Universal-3 Pro) + LLM routing + VAD/turn-taking + JSON-Schema tool calling, which is exactly the stack Mockrill needs for scorecard tool calls; Path B (Realtime STT + BYO LLM/TTS) is also a valid fallback. The guess's Path A preference was therefore correct to keep.
* All chassis module mappings (withStt/withTts, resilience, context, cost, platform TRN + deploy, provenance, pitch tooling) match the mandated tech verbatim — no module needs adding or dropping.
* Solo + online + month-long window + no mandated end-to-end build platform all confirmed — the pipeline's weekly pacing (W1 Hour-0 → W4 Package → Buffer) from the walkthrough still applies.
* Internal deadline logic (20% early → Wed Sep 24 15:00 UTC) holds — hard deadline is unchanged.

**Where it was wrong / still `[unconfirmed]`:**
* No item guessed as `[unconfirmed]` was resolved by kickoff — credit amount, video cap, judging weights, builder-access details, team-cap boilerplate confirmation, and sponsor sub-challenges all remain `[unconfirmed]/TBA`. The guess correctly marked them as such; the error would have been to invent them.
* The guess's referral to "Introduction to the Challenge (15:15 UTC)" and "Hackathon Guide (15:25 UTC)" as the place where extra constraints would appear was correct — but as of 15:00 UTC pre-stream, no written addendum has been published. Those two slots are still the open questions.

**Feasibility go/no-go verdict:** **GO — unchanged and strengthened.** The event remains laslab.ai-hosted, solo-allowed, online-only, with no mandated vendor build platform beyond "use AssemblyAI" — the one disqualifier from `design_documents/lablab_hackathon_strategy_blueprint.md` §5 check #1 does not trigger. The only delta is higher competitive density, which is a PAS-scope concern, not a go/no-go flip. If kickoff Q&A announces a mandated end-to-end platform, a gated enterprise-only Voice Agent API tier, or an explicit ban on pre-built scaffolding, re-evaluate immediately.

**Kickoff-only decisions worth logging:**
* Claim AssemblyAI credits **today** via the event's dedicated link — accept cookies during sign-up; if you already have an account, log out first, then log back in through the link. External knowledge: base free tier is $50 (~238h Universal-3 Pro async or ~111h streaming STT; Voice Agent API burns ~11h per $50 at $4.50/hr) — treat event bonus credits as `[unconfirmed]` until the dashboard shows them.
* Warm the Reddit tier-1 cache from a **residential IP** before running PGM Stage 2 (PGM-K2-05) — use voice/job-relevant subreddits (`interviews,cscareerquestions,jobs,ExperiencedDevs,recruitinghell,languagelearning,speechrecognition`) — datacenter IPs get 403 and `mining_no_reddit_data` → Stage 2 FAILED.
* Do a one-time `src/priorart` Discord login *before* the PGM run so the prior-art scan does not block on 2FA during Hour 0.

### Prep-phase notes (superseded where contradicted by kickoff facts — kept as decision record)

* Prep transcriptions lived at `preparing/2026-09-AssemblyAI-Voice-lablab/hackathon_brief.md` (2026-08-26, 395 participants) and `preparing/2026-09-AssemblyVoice/hackathon_brief.md` (same date, slightly expanded tables). Both classified the event as **PARTIALLY DEFINED**: binding frame fully published, but the exact product deliberately open ("Build a voice agent" + two implementation paths, not a specified product). That classification **still holds on 2026-09-01** — see Step 2 in §4.
* The chassis mapping table from the prep version is re-asserted here verbatim (it was correct):
  - Mandatory realtime STT / Voice Agent API single connection → `withStt` (`src/media`, `media/stt`) — `OPENAI_API_KEY` in catalog, but runtime needs `ASSEMBLYAI_API_KEY`; `ELEVENLABS_API_KEY` only if ElevenLabs TTS chosen on Path B
  - Path B BYO TTS → `withTts` (`src/media/tts`)
  - Flaky WebSockets → `src/resilience` + golden cache + `RES_FORCED_DEGRADED=1`
  - Long voice conversations → `src/context`
  - BYO LLM routing → `src/cost`
  - Live transcript UI + required hosted URL → `src/platform` TRN + `DEP` (`VERCEL_TOKEN`, `VERCEL_PROJECT_ID`)
  - Disclosure + 10-field submission → `src/provenance` PROVO/SUBMIT
  - Deck/script/Q&A/golden demo → `src/ideation/*` (`OPENAI_API_KEY`, Playwright)
  - Hour-0 grounding → PROFILE/PGM/PAS/ADV (or `--llm sweep` keyless variants)
* Known prior-art risks from prep that remain live (verify with PAS `scan-lablab` + `scan-discord` + `evaluate`): (1) team **Himaless / IncidentBridge AI** (evidence-backed voice incident commander with speaker+timestamp citations) overlaps Mockrill's "timestamp-quoted scorecard" mechanic — differentiate domain or mechanic; (2) generic interview-prep voice agents will be dense in a month-long open brief with 1,374 builders — the *realtime coach that quotes exact spoken moments and re-drills by voice* angle must be shown distinct; (3) team **Zypher** ("voice-driven technology") and others already formed by Aug 26 — re-scan Sep 1 gallery.
* Constraints carried forward: solo, online, demo must survive bad Wi-Fi (offline golden path via mock envelopes + early DEMODRIVE capture), hard deadline Sep 30 15:00 UTC, internal target Sep 24 15:00 UTC.

### The official project broken down for my use

**Specific user persona:** career-switching junior developers preparing for their first technical-screening *calls* (not take-homes) — e.g., bootcamp grads, self-taught devs with <1 year professional experience, whose screening interviews are already conducted by voice (phone/Zoom) and who have no affordable way to rehearse spoken answers under turn-taking pressure.

**What it does:** *Mockrill* — a realtime AI mock-interview voice coach. You speak with an interviewer agent over AssemblyAI (Path A single connection preferred; Path B as fallback). The agent runs a realistic screening call (role-specific questions, follow-ups, interruptions) with VAD/turn-taking handled by AssemblyAI and tool-calling (JSON Schema) driving question selection and scoring. Universal-3 Pro / Universal-3.5 Pro captures every answer with word-level timestamps, disfluency signals, and `turn_is_formatted` turns. Afterwards you get an evidence-backed scorecard that **quotes your exact spoken moments** ("at 07:42 you said 'kind of' 3× before answering") and re-drills your weakest answers by voice in the same session.

**Why AI / why now:** interviews are a *spoken* skill — flashcards and chat transcripts cannot rehearse turn-taking, barge-in, filler-word habits, or pressure. Cheap sub-second realtime voice APIs (Universal-3 Pro streaming, ~250ms-class turn handling, promptable transcription via keyterms) only became practical at consumer price points in 2025–2026, which is exactly what this event mandates building on. Without realtime voice, this product is impossible; with it, it is a one-connection demo.

**Business value:** named user above (bootcamp grads / career switchers); **revenue model** = B2C monthly subscription (individual practice packs) + B2B licensing to coding bootcamps' career-services (per-cohort seats); **TAM anchor** = bootcamp + job-prep / interview-coaching market `[figure to pin down during PGM — do not invent; PGM will ground this]`; **why this needs AI** = only a voice agent can listen, interrupt, and score *spoken* behavior with timestamp evidence — a CRUD app or LLM chat window cannot observe the behavior it claims to coach.

**Demo story (60 seconds, strongest Presentation evidence):** a judge talks to Mockrill live for 60 seconds (one screening question + follow-up) and receives a live-updating transcript + a scorecard about *their own* answers in the same browser tab — the demo is their own voice, not a canned video. Fallback ladder applies if venue Wi-Fi dies (see constraints). The "wow" moment is the exact quote with timestamp; the "trust" moment is the re-drill ("try that answer again — here's the bar").

**Judging-axis strategy — how each axis gets evidenced by my build via DECKGEN/SCRIPT/FAQDEF/SUBMIT artifacts:**

| Axis | How it is evidenced (artifact + moment) |
|---|---|
| **Application of Technology** | Assembly manifest arch summary (PROVO `prov-05` paragraph) + wrapped-call demo: `withStt` over `wss://streaming.assemblyai.com/v3/ws` with `universal-3-5-pro` (or Voice Agent API `POST /v1/agents` + browser/phone deploy) — live on `https://` (mic requires secure context), smoke-verified via `npm run deploy:verify` and `assembly.manifest.json` commit spread |
| **Presentation** | DECKGEN deck (13 slots + SVG charts), SCRIPT mm:ss timed script sized to the 3–5 min band (opens on the ticking transcript, not a title slide), DEMODRIVE golden capture (`assets/demodrive/`) + manual spoken-session recording as insurance — both show the judge's own voice → scorecard flow |
| **Business Value** | Plan's `specific_user` / `tam_figure` / `revenue_model` / `why_ai` fields feed deckgen charts verbatim; slide 03 (Specific User) names the junior dev persona, slide 05 (Business Value) carries the bootcamp-licensing model and TAM figure grounded by PGM, not invented |
| **Originality** | PGM evidence-grounded framing + PAS prior-art verdict report (`private/priorart/prior_art_report.{json,md}`) quoted in deck §08 and Q&A: the *realtime voice coach that quotes exact timestamped speech* is distinct from generic "interview prep chatbots" and from overlapping event entries (IncidentBridge AI) — differentiation is explicit in the Q&A sheet |

### Chassis module mapping implied by the definitive challenge (grounded in `contracts/component-catalog.json`)

| Event demand | Chassis coverage | Catalog row (`requires_env`) |
|---|---|---|
| Mandatory realtime STT (Universal-3 Pro / WebSocket STT) + Voice Agent API single connection | `withStt` media wrapper (`src/media`, `media/stt`) — degrade-never-throw, unified `MediaMessage` | `media`: `OPENAI_API_KEY` in catalog; **runtime for this event: `ASSEMBLYAI_API_KEY`** (providers openai/replicate/elevenlabs sub-wrappers unused) |
| Path B "bring your own TTS" | `withTts` (`src/media/tts`) or direct AAI/OpenAI TTS behind resilience | `ELEVENLABS_API_KEY` only if ElevenLabs is the chosen TTS; otherwise AAI/OpenAI TTS |
| Flaky realtime WebSockets / Voice Agent API sessions | Resilience wrappers + golden cache (`src/resilience`), `RES_FORCED_DEGRADED=1` kill switch | none |
| Long multi-turn voice conversations | Context buffer (`src/context`) | none |
| BYO-LLM routing (Path B) + all agent/tool calls + `connect-your-own-llm` option | Cost guardrail (`src/cost`), context buffer | none (local metering) |
| Live transcript / agent-state streaming UI | Platform transport + mock envelopes + UI themes (`src/platform`) | `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` when deploying |
| Required hosted Application URL (submission fields 9–10) + mic requires HTTPS | One-command deploy + smoke (`src/platform/deploy`) | same as above |
| Disclosure + 10-field submission copy + secret-scan | PROVO + SUBMIT (`src/provenance`) | none |
| Deck / pitch script / judge Q&A / golden demo | DECKGEN, SCRIPT, FAQDEF, DEMODRIVE (`src/ideation/*`) | `OPENAI_API_KEY` (deckgen/script/faqdef), Playwright (demodrive) |
| Hour-0 grounding & planning | PROFILE, PGM, PAS, ADV (run in chassis repo, pre-assembly) | `OPENAI_API_KEY` or `--llm sweep` keyless variants; PAS needs residential IP + one interactive Discord login |

**Full env-var set to have ready:** `OPENAI_API_KEY` · `ASSEMBLYAI_API_KEY` (claimed via the event's credit link into `ASSEMBLYAI_API_KEY` — same var read by both streaming SDK and Voice Agent API starters) · `VERCEL_TOKEN` + `VERCEL_PROJECT_ID` (deploy) · `ELEVENLABS_API_KEY` (optional, only if used on Path B) · optionally `ANTHROPIC_API_KEY` (advisor). Reddit mining and PAS corpora collection need no API keys (residential IP + one interactive Discord login per machine).

### Constraints I care about this event (my notes)

* **Solo/team:** solo entry allowed (team 1–6 boilerplate); 302 teams already forming with open slots — solo is viable but recruiting 1 domain teammate from Discord remains an option from event #2 logic.
* **Online:** fully online; no on-site. Build from anywhere.
* **Demo must survive bad Wi-Fi:** offline golden path mandatory — UI against `mock:publish` envelopes (`src/dev/mock`), `npm run build:ui` offline sanity, early DEMODRIVE capture (`--fast --full-page`), and the 4-rung fallback ladder (live → degraded live `RES_FORCED_DEGRADED=1` → recorded video → localhost sync render).
* **Sponsor-credit claiming procedure:** via the event's dedicated link `https://www.assemblyai.com/dashboard/signup?utm_source=event&utm_medium=credit-grant&utm_campaign=lablab_virtual_hackathon` — **accept cookies during sign-up; if you already have an account, log out first, then log back in through the link to activate the credits** (quoted verbatim from the event page — see §4). Do it on day 0 and verify a 1-line streaming call (`transcribe.py` with `universal-3-5-pro`) before building on it. Credit amount `[unconfirmed]` on the event page; external $50 free-tier figure is not the event bonus.
* **Hard deadline:** **Wed 2026-09-30, 15:00 UTC (19:00 GST)** — submissions close, judging begins. Manual submission window only **6 hours** post-deadline with prior organizer/mentor approval — do not plan around it. Internal target: **Wed 2026-09-24, 15:00 UTC** (~20% of the 29-day window early; satisfies the ≤24 h-before rule per blueprint §6).
* **Registration window:** contradicted — intro says "join at any point" while `/live` says "Registration closes the moment the event starts." Until 16:00 UTC Discord Q&A clarifies, assume you can still join/register today but do it early.
* **Mic requires HTTPS:** deploy the browser voice UI before any real-voice demo (`npm run deploy` + `deploy:verify`) — `getUserMedia` is blocked on `http://`.
* **Hour-0 cache discipline:** `npx vite-node scripts/refresh-cache.ts --subreddits interviews,cscareerquestions,jobs,ExperiencedDevs,recruitinghell,languagelearning,speechrecognition --months 6` from a residential IP before Sep 1; then `npx vite-node src/pgm/cli.ts --reddit-only` must exit 0 before spending LLM budget.

---

## Hackathon Rules - Requirements - Tracks

> This section is the **sole source-of-truth** for the hackathon's binding challenge, tracks, requirements and rules as published on `https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon` and its binding linked pages (Rule Book `/hackathon-rules`, Hackathon Guidelines `/guide`, Getting Started Guide `/getting-started-guide`, Submission Guidelines `/delivering-your-hackathon-solution`, Phase-1 Terms of Use `#16`, and sponsor/partner AssemblyAI pages/resources). It contains verbatim quoted excerpts **plus** a concise summary — only what the website actually states is summarized/transcribed; nothing is invented. Other sections (e.g., §2) contain only a one-line summary and a cross-reference such as "see §4 for verbatim" instead of repeating the full text, per the non-duplication rule. Conversely, prizes/schedule/teams/submission-field checklist/judging table/official resources are already in §2 and are not re-listed in full here — referenced as "see §2" if needed.

### Binding challenge — verbatim excerpts (as published 2026-09-01)

Quoted from the event page's Challenge tab / About block (the two published paths are the entire challenge definition besides the mandated-tech line):

> "Build a voice agent using AssemblyAI's real-time voice AI technology. Choose the approach that fits your idea and how much of the voice stack you want to build yourself."

> "Path A — Voice Agent API (end-to-end, one connection) — Build an end-to-end voice agent through a single connection, with AssemblyAI handling the core voice interaction stack: • Speech-to-text powered by Universal-3 Pro • LLM routing and voice output • Turn-taking and voice activity detection • JSON-Schema tool calling • Designed for fast, natural voice interactions"

> "Path B — Realtime Speech-to-Text API (bring your own orchestration) — Use AssemblyAI's real-time speech-to-text API as the foundation of your voice agent, while bringing your own orchestration: • Real-time speech-to-text over WebSocket • Sub-second transcription • Multilingual speech recognition • Bring your own LLM and text-to-speech • More control over your voice-agent architecture"

> "Every participant builds on AssemblyAI." (header block, same line on ` /` and `/live`)

> "Additional information about builder access and the challenge will be shared as it becomes available." (footer line under Challenge — still present on 2026-09-01; confirms the challenge frame is complete but ancillary builder-access details are deferred)

**Summary:** the hackathon's *binding project* is deliberately open-ended — the organizer mandates the *technology* (AssemblyAI via Path A or Path B above) but not a specific product, domain, or user story. Any voice agent that idiomatically uses AssemblyAI's realtime APIs qualifies. There are **no published tracks** beyond these two paths as of Sep 1 — the live dashboard still shows `Tracks: TBA / Announced soon` (see §2). If the 15:15 UTC "Introduction to the Challenge" kickoff slot announces additional constraints or sponsor sub-challenges, they become binding at that point and this brief must be amended.

### Tracks / sub-challenges — what's published

* **Tracks: TBA** — no track list or sponsor sub-challenge list is published on the event page as of 2026-09-01 (the event record's `sponsors: []`, `eventPrizes: []` still empty; see §2 Prizes). A single technology being used this round is reported on `/live` as `AgentOps (1)` — this is community self-reported, not an organizer track.
* The event is **layered vs. partner-led** check (§5 of `design_documents/lablab_hackathon_strategy_blueprint.md`): no evidence of a partner-led "choose one tech and get judged only there" structure — the two paths are alternatives within one overall ranking (see Judging in §2). `[Confirm at 16:00 UTC Q&A if any layered sponsor prizes are added.]`

### Mandated technology + credits/keys procedure — verbatim + summary

**Mandated technology (verbatim):**

> "Every participant builds on AssemblyAI." (header block)

> "Build a voice agent using AssemblyAI's real-time voice AI technology." (challenge header)

> AssemblyAI Voice Agent API docs: *"Real-time voice agents that talk and listen. Configure an agent once, then deploy it to a browser, your own app, or the phone."* — starters at `github.com/AssemblyAI/voice-agent-starter-python` (Python 3.9+, stdlib only) and `voice-agent-starter-js` (Node 18+), auth via `ASSEMBLYAI_API_KEY` in `.env`, publish via `python publish.py` / `npm run publish`, talk via `python deployment/browser/server.py` / `npm start` at `http://localhost:3000`, optional phone via Twilio SIP trunk.

> AssemblyAI Realtime STT docs: *"Learn how to transcribe streaming audio."* — `wss://streaming.assemblyai.com/v3/ws` with `Authorization: <API_KEY>`, models `universal-3-5-pro` / `universal-streaming`, `encoding: aac` / `pcm` / `opus`, SDK `assemblyai` (`pip install assemblyai`), events `Begin` / `Turn` (`end_of_turn`, `turn_is_formatted`, `words[]` with `start`/`end`/`confidence`) / `Termination`. Note: *streaming billed on total WebSocket open duration, auto-closes after 3 hours; close with Terminate.*

**How to obtain credits/keys (verbatim from event page + linked signup):**

> "Sign up using the event's dedicated link to claim free credits `[credit amount unconfirmed — no figure on the event page as of 2026-09-01]`: https://www.assemblyai.com/dashboard/signup?utm_source=event&utm_medium=credit-grant&utm_campaign=lablab_virtual_hackathon — Please make sure to **accept cookies during sign-up**. If you already have an account, **log out first**, then use the link above to log back in and activate your credits."

> AssemblyAI dashboard signup externally grants **$50 in free API credits on signup** (no credit card) — visible at `assemblyai.com/dashboard/signup` and documented at `assemblyai.com/pricing` / `aicredits.dev` — this is the public free-tier grant, not necessarily the event bonus. At streaming pricing `$0.45/hr` (Universal-3 Pro Streaming) or `$4.50/hr` (Voice Agent API), the $50 baseline covers ~111h streaming or ~11h Voice Agent API. **The event-bonus top-up amount remains `[unconfirmed]` — the `utm_campaign=lablab_virtual_hackathon` link's bonus is not enumerated on the event page and may be disclosed on the dashboard after claiming or at kickoff.** Claim via the link, log out/in, accept cookies, and check the dashboard credit balance before building.

**Summary:** one dependency only — AssemblyAI (either path qualifies as idiomatic use). No secondary mandated technology is published. The key var is `ASSEMBLYAI_API_KEY` (Voice Agent API) and the same key for Streaming STT (`Authorization` header). For browsers, mint a short-lived temporary token instead of shipping the key client-side (`/docs/streaming/authenticate-with-a-temporary-token`). SDKs: `assemblyai` (Python/JS), `websocket-client` if using raw WS, `LiveKit Agents` as orchestration on Path B, optional Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_TRUNK_DOMAIN`) for phone deployment.

### Submission requirements — binding scope (see §2 for exact 10-field list)

The 10-field list in §2 *is* the submission requirement for this event. §4 adds only the binding format/license layer: public GitHub repo, MIT-compliant original work, required Application URL for interactive evaluation, cover 16:9 PNG/JPG, video MP4, slides PDF, optional manual submission window 6h with prior approval. No word-limit or field-length constraint beyond tech tags is published on the event page — the Rule Book's rubric carries the "<5 min video" presentation band (see §2).

### Rules highlights — verbatim excerpts (from the event page + linked Rule Book / Guidelines / Terms, as transcribed on 2026-09-01)

> "Submissions must be **original and MIT-compliant**" (event-page prize fine print; repeated in Rule Book)

> "Participation in lablab.ai hackathons is **voluntary**; prizes and opportunities depend on **eligibility, availability and third-party sponsors**; hackathon **rules, prizes and terms may change or be canceled** at lablab's discretion" (event-page fine print)

> "Prize distribution may take **up to 90 days**." (same)

> "Full details: https://lablab.ai/terms-of-use#16-participation-terms" (participation terms anchor)

> "Read the **Hackathon Guidelines**, **Getting Started Guide**, and **lablab.ai Hackathon Rule Book** (linked from the event page) before submitting." (intro block)

> From Rule Book / Submission Guidelines (binding formatting, as summarized in §2): *"Cover image **PNG or JPG, 16:9 aspect ratio**; **video presentation MP4** and **slide presentation PDF** are **mandatory**; **GitHub repository mandatory** ('for storing your code'); **Application URL / demo link required** ('for interactive evaluation'). The Presentation rubric rewards a video that 'effectively communicates the problem, solution, and value proposition in **less than 5 min**' and penalizes videos under 3 min — i.e. aim for the 3–5 minute band."*

> "Plagiarism or **gaming the voting system = immediate disqualification**; lablab may **remove participants who undermine fairness** (cheating, tampering, unauthorized automation, fraud)." (Rule Book)

> "Organizers may participate but are **not eligible for prizes**; mentors/organizers cannot judge." (Rule Book / Guide)

> "Manual submission is available for **6 hours post-hackathon** for those with valid reasons and **prior approval** from organizers or mentors." (Rule Book, as transcribed in prep)

**Summary of rules compliance for this event:** (a) no mandated end-to-end build platform beyond AssemblyAI — custom codebases allowed (blueprint §5 check #1 passed); (b) layered-track structure (overall ranking + any sponsor sub-challenges added later — none today); (c) core AI-powered functionality must be built during Sep 1–30 (agent prompts, dialogue policy, RAG corpus, turn-taking/tool-calling tuning), while pre-built **non-AI scaffolding** (resilience wrappers, cost guardrail, context buffer, media/platform wrappers, packing tooling) is allowed as personal open-source scaffolding **if disclosed** — the Rule Book text transcribed today contains **no explicit "disclose pre-built scaffolding / AI assistance" clause** `[unconfirmed — verify in a browser at kickoff; lablab norms and the Provenance toolkit both recommend disclosing regardless]`; (d) MIT-compliant + original, no plagiarism, no vote gaming; (e) cover/video/slides/repo/URL formats as above; (f) prize terms may change; distribution up to 90 days; (g) registration/team norms in §2.

### What was NOT verifiable on 2026-09-01 (explicit open questions for Discord Q&A / Twitch kickoff)

All marked `[unconfirmed]` above; consolidated open-question list:

1. Credit **amount** behind `utm_campaign=lablab_virtual_hackathon` (event page shows link but no figure; dashboard may show balance after claiming).
2. Video presentation **length cap** (event page silent; Rule Book rubric implies <5 min optimal, penalties under 3 min — but is there a hard cap?).
3. Judging **weights** per axis (not published; only axes named).
4. **Builder access** details promised as "will be shared as it becomes available" — is there a separate API enablement or workshop after 15:10 UTC AssemblyAI Opening words?
5. Team-size **cap confirmation** (1–6 is guideline boilerplate flagged unconfirmed; live page's 302 teams suggest solo is fine but the cap text is still "NOT confirmed for this event").
6. Whether **new sponsor sub-challenges / tracks** appear after the 15:15 UTC Introduction to the Challenge (live page still TBA).
7. Voice Agent API **access tier / GA status** for hackathon accounts (is the `POST /v1/agents` + browser/phone deploy fully available on free-tier keys?).
8. Rule Book's **disclosure clause** status — does the current live Rule Book now contain an explicit scaffold/AI-assistance disclosure duty that was absent on 2026-08-26?
9. Registration-window **contradiction** (`/live` says "Registration closes at kickoff" vs intro says "join at any point").
10. Whether the kickoff adds any **hidden evaluation dimension** beyond the four published axes (e.g., separate community-vote weighting visible on `/live`'s Leaderboard/Referrals).

Every item above is a question to ask in the 16:00 UTC Discord Q&A or to re-check on the event page after the 15:15/15:25 sessions — not an assumption.

### Classification of today's publication (Step 2, with quoted evidence)

**DEFINED frame; open-ended project (not a specified product).**

* Binding frame is fully published and unchanged since 2026-08-26 — quoted evidence above: *"Every participant builds on AssemblyAI"* + the two explicit path definitions with bullet-list capabilities. This is the complete organizer-specified requirement; it satisfies the "DEFINED" threshold for the chassis (mandated tech, paths, deliverables, dates, prizes, axes all published).
* The *product* is deliberately undefined — the challenge is *"Build a voice agent"* (quoted), not a named product brief. The page's own deferral line (*"Additional information about builder access and the challenge will be shared as it becomes available"*) plus the live dashboard's *Tracks: TBA* banner prove no hidden product track exists today. This is intentional open-endedness (standard for lablab.ai — §3.2 of the strategy blueprint), not missing information.
* Consequence: PGM + PAS still choose the specific product direction at Hour 0 (here: *Mockrill* `[GUESS]` pending validation) — the pipeline's problem-grounding step is mandatory, not optional, precisely because the brief mandates *how* (AssemblyAI) but not *what*.

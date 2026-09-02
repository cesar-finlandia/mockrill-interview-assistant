# Script — Mockrill 4:00 — ticking transcript opening
---
script_version: "1.0.0"
total_minutes: 4
timing_source: timing.yaml
live_section: demo
generated_at: 2026-09-02T02:15:37.815Z
source_plan_hash: 95575c0cfe646c38
source_manifest_hash: 3149e67689a6becb
fallback: RES-01 degraded — blank template
---

# Script — Pitch Video (4:00) — DRAFT TEMPLATE — fill spoken text manually

> Requirement IDs: SCRIPT-01, SCRIPT-02, SCRIPT-03, SCRIPT-04
> Timing: total 4:00 | sections 9 | live cue: ▶ LIVE DEMO

| Time | Section | Spoken | Visual |
|------|---------|--------|--------|
| 00:00–00:10 | Hook Transcript Open | > **TODO:** [00:00 ticking transcript] words streaming with timestamps — NO title slide — Mockrill opens on live transcript (words + start/end ms) to decide Presentation score in first 10 seconds. This 4:00 script stays inside the 3-5 min band with 1 min margin both ends. Junior bootcamp grads watch their own words appear with millisecond evidence before any coaching begins. | Visual: setup |
| 00:10–00:35 | Problem | > **TODO:** Spoken-screen freeze — the 15-min voice screen where filler, vague STAR, and freeze cost the offer. Text prep cannot observe speech; Mockrill listens to what you actually said at 07:42 and quotes it back with timestamps for evidence. | Visual: live-call |
| 00:35–01:05 | User and Product | > **TODO:** Junior bootcamp grads and career switchers 12-24 weeks post-grad, 2-5 applications per week — named segments, never everyone. Product in one sentence: voice interviewer that asks role-specific questions with real turn-taking and barge-in, then returns timestamped evidence plus re-drill of the weakest answer by voice on the same call. | Visual: scorecard |
| 01:05–01:35 | How It Works | > **TODO:** How it works — architecture diagram from docs/architecture.mmd — mic → StreamingClient → wss://streaming.assemblyai.com/v3/ws → TurnController → speechSynthesis + POST /api/turn → LLM Gateway. One ASSEMBLYAI_API_KEY, word-level timestamps, turn_is_formatted finalization. | Visual: drill |
| 01:35–02:05 | AssemblyAI Usage | > **TODO:** AssemblyAI usage — Universal-3.5-Pro streaming literal params: format_turns true, keyterms_prompt [STAR, React, system design], end_of_turn_confidence_threshold 0.4, vad_threshold 0.2, interruption_delay 200ms, mode balanced, plus GET /v3/token and POST llm-gateway /v1/chat/completions with JSON-Schema tools. | Visual: history |
| 02:05–03:10 | **Demo** | > **TODO:** Demo 01:05 — Real spoken session — transcript → scorecard → re-drill on same socket, same session. TurnController stays in scoring→drill, LLM Gateway re-asks weakest question, new words[].start/end compared. DEMODRIVE capture is fallback only if live fails on recording day. | **▶ LIVE DEMO — moving capture** `setup` — moving capture, never a static title card |
| 03:10–03:35 | Business Value | > **TODO:** Business Value — B2C $19/mo subscription plus B2B bootcamp per-seat licensing $499/yr. Bottom-up TAM: 90k US bootcamp grads [estimate] + 150k self-learners [estimate] =240k; 15% willing =>36k; B2C 36k*$19*3mo=$2.05M plus B2B 500*20*$499=$4.99M => ~$7M ARR, SAM ~$700k at 10%. Arithmetic visible. | Visual: live-call |
| 03:35–03:50 | Originality and Next | > **TODO:** Originality and next — prior art: evidence-backed voice agents and generic interview bots. Differentiator: re-drill loop quotes at 07:42 then candidate says it again better in same session, same socket, same word-level evidence. Next: 30/60/90-day more roles, rubric tuning, B2B pilots. | Visual: scorecard |
| 03:50–04:00 | Close Disclosure | > **TODO:** Close — disclosure + MIT license 2026 Mockrill Contributors + Application URL. Try it at the hosted URL. AssemblyAI powers streaming STT and LLM Gateway on one key. Thank you. | Visual: drill |

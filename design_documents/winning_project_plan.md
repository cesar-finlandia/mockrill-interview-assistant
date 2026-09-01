---
title: "Mockrill — Realtime AI Mock-Interview Voice Coach"
persona: "Junior Developer Screening Caller (r/cscareerquestions, r/interviews, r/jobs)"
sponsor_tracks: ["AssemblyAI Voice Agent API", "AssemblyAI Realtime STT API"]
created_at: "2026-09-01T19:30:00.000Z"
source_brief_hash: "a8ed0cd949db67145c83e335b219ff45e85cb117e35a1294fd366c26505da444"
version: "1.0.0"
grounded: false
---

## Executive Pitch

Junior bootcamp graduates with <1 year experience dread voice technical screens: they freeze on follow-ups, filler words spike, and no affordable way exists to rehearse spoken answers under real turn-taking pressure before live phone/Zoom screens. Mockrill is a realtime AI mock-interview voice coach built on AssemblyAI: a single-connection Voice Agent API interviewer (Universal-3 Pro STT, LLM routing, VAD/turn-taking, JSON-Schema tool calling for rubric scoring) — with fallback Realtime STT API over wss://streaming.assemblyai.com/v3/ws (universal-3-5-pro + BYO LLM/TTS) — that runs a realistic screening call, then returns an evidence-backed scorecard quoting exact spoken moments ("at 07:42 you said 'kind of' 3× before answering") and re-drills weakest answers by voice in the same session. It could not have been built two years ago with forms+DB: sub-second voice turn-taking, VAD and word-level timestamps are the core capability.

## Problem Framing

Evidence: persona Junior Developer Screening Caller (r/cscareerquestions, r/interviews, r/jobs, 2026) — bootcamp grads report freezing on voice follow-ups and lack of affordable spoken rehearsal. Mining hit: mined_frustrations.json shows 9/10 records skip_ungrounded (direct Reddit HTTP 403 + browser lane 403 on datacenter IP; local cache had only 1 grounded freelance record from 2026-06, score 73, r/freelance), so this framing is [GUESS]/ungrounded and requires manual IDEA-03 gallery scan before pitching — per PGM caveats ground-truth must be confirmed. Pain severity: recurring, high-stakes (one failed screen loses offer), workaround cost = paid coaches ($50-150/hr) or peer mocks with no timestamp evidence. Severity is interview-failure leading to delayed hire, not inconvenience.

## AI Solution

AssemblyAI Voice Agent API (Path A) end-to-end via single connection: Universal-3 Pro STT, LLM routing and voice output, turn-taking/VAD, JSON-Schema tool calling for question-selection and rubric scoring. Publish starter agent via github.com/AssemblyAI/voice-agent-starter-python (or js), configure agent JSON with system_prompt, voice_id anna, greeting, publish.py, then talk at http://localhost:3000 (Chrome/Edge) or phone via Twilio SIP. Fallback Path B: Realtime STT over wss://streaming.assemblyai.com/v3/ws with Authorization ASSEMBLYAI_API_KEY, speech_model universal-3-5-pro, encoding aac/pcm, handling Begin/Turn (end_of_turn, turn_is_formatted, words[start,end,confidence])/Termination events, BYO LLM + TTS. Hosted on Vercel (HTTPS required for getUserMedia) + public GitHub repo per submission gate. Conversation buffer holds multi-turn STAR answers; resilience wraps every AssemblyAI WebSocket call.

## Why Now

IDEA-02 filter: could this have been built 2y ago with forms+DB and no AI? No — requires AssemblyAI sub-second realtime voice turn-taking, VAD/barging handling and word-level timestamps with turn_is_formatted at consumer latency/price that were not feasible at scale before Universal-3 Pro/3.5 Pro streaming. Two years ago only batch STT existed; realtime interruptible voice coaching with timestamp-quoted filler detection was impossible without this stack.

## Target Persona

Primary: Junior bootcamp graduate preparing for first voice screening calls (career-switching developer, <1 year pro experience, screening via phone/Zoom). Needs patient interruptible interviewer, not judgmental human. Secondary: career-switching teacher/edtech entrant who aces written apps but fails voice screens on STAR structure (persona-08). Both share same rehearsal loop: speak → get timestamp-quoted feedback → re-drill weakest answer by voice. Persona-01 target_subreddits cscareerquestions/interviews/jobs reflect this primary.

## Business Value

- specific_user: junior bootcamp graduates / career-switching developers preparing for first technical-screening voice calls (named, not "everyone")
- tam_figure: bootcamp + job-prep / interview-coaching market — [figure to pin down via manual research; PGM grounded_fraction 0 so do not invent; validate before deck]
- revenue_model: B2C monthly subscription (practice packs, per-interview credits) + B2B licensing to coding bootcamps' career services (per-cohort seats)
- why_ai: only a voice agent can listen, interrupt, and score spoken behavior with timestamp evidence (filler counts, pacing, turn-taking) — a CRUD app or LLM chat window cannot observe the behavior it claims to coach

## Architecture

Engine-layer spec for planner pipeline: capture mic → AssemblyAI Voice Agent API (or Realtime STT WebSocket wss://streaming.assemblyai.com/v3/ws + BYO LLM/TTS) streaming 16-bit mono PCM (or AAC) with VAD; LLM routing via JSON-Schema tools (select_question, score_answer, tag_filler); TTS voice output; client handles barge-in and turn_is_formatted finalization. Data flow: audio chunks → Turn events → LLM tool calls → rubric store → scorecard renderer quoting words[start,end] timestamps. UI states: pre-call setup, live transcript ticking, scorecard (timestamp quotes + re-drill button), history. Prompt boundaries: deconstruction/synthesis prompts domain-free; domain enters via brief/catalog only. Corpus needs: role-specific question banks (STAR, behavioral), scoring rubrics, filler-word lexicon. Contracts: MediaMessage shape for STT, DegradedResult for resilience fallback (golden cached Turns). No fixed Engine topology pre-decided — capability boundary only.

## Suggested Module Emphasis

Consider media/stt as primary ingestion (Universal-3 Pro) and media/tts for Path B; resilience wrapper on every AssemblyAI WebSocket/TTS call with timeout 15000ms, retries 1, fallback chain cache→none, plus RES_FORCED_DEGRADED kill switch. Context buffer for long voice conversations to avoid token overflow. Cost guardrail around every LLM/tool call. Platform transport (TRN) + mock envelopes for live transcript ticking UI, deploy via Vercel (VERCEL_TOKEN/PROJECT_ID, HTTPS for mic). Provenance disclosure via PROVO. Ideation deck/script/FAQ/demodrive for pitch. These are advisory suggestions only — the Assembly Advisory module decides the manifest; do not embed manifest_version/included/components blocks here.

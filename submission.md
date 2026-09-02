# Submission — Mockrill — Realtime AI Mock-Interview Voice Coach

<!-- Generated via: npx vite-node src/provenance/submit/cli.ts format --plan winning_project_plan.md --manifest assembly.manifest.json --disclosure disclosure.md --out submission.md -->
<!-- DP-PITCH: fields 5-7 -->
<!-- DP-DEPLOY: fields 9-10 -->

## 1. Title
Mockrill — Realtime AI Mock-Interview Voice Coach

## 2. Short description (≤ 280 chars)
Rehearse spoken technical screens with a realtime voice interviewer that quotes your exact moments and re-drills the weakest answer by voice.

## 3. Long description

Junior bootcamp graduates with less than one year of experience consistently fail voice technical screens not because they lack knowledge, but because they cannot rehearse spoken delivery under realistic pressure. They freeze on follow-ups, sprinkle filler words, and have no affordable way to practice turn-taking and pacing before a live phone or Zoom interview. Existing preparation is either expensive human coaching at $50–150 per hour or peer mocks that provide no timestamped evidence of what went wrong.

Mockrill is a realtime AI mock-interview voice coach built on AssemblyAI. A single-connection interviewer connects the browser directly to AssemblyAI streaming via Path B (Realtime STT over wss://streaming.assemblyai.com/v3/ws with a short-lived token from GET /api/aai-token) and orchestrates the conversation through the AssemblyAI LLM Gateway (POST https://llm-gateway.assemblyai.com/v1/chat/completions, model claude-sonnet-4-6 fallback qwen3.5-4b-32k-fast) with JSON-Schema tool calling for question selection and rubric scoring. Voice output uses the browser speechSynthesis API instead of a TTS vendor, so no second key or second API is required. The agent runs a realistic screening call, then returns an evidence-backed scorecard quoting exact moments and re-drills the weakest answer by voice in the same session.

We chose Path B browser→AssemblyAI streaming direct because it avoids a server-side audio proxy and keeps one secret server-only (ASSEMBLYAI_API_KEY never reaches the browser bundle). The LLM Gateway was chosen for orchestration because it provides tool-calling with structured InterviewerAction outputs and automatic fallback, while speechSynthesis was chosen for voice output to avoid vendor lock-in and latency. Together they satisfy the Application-of-Technology criteria with exact parameters speech_model universal-3-5-pro, sample_rate 16000, encoding pcm_s16le, format_turns, end_of_turn_confidence_threshold 0.4, vad_threshold 0.2, and max_turn_silence 1536.

Business value is B2C and B2B. B2C is a monthly subscription for individual job-seekers selling practice packs and per-interview credits to bootcamp graduates preparing for their first screens. B2B is per-cohort licensing to coding bootcamps and career-service platforms that need scalable, evidence-based mock interviews without hiring human coaches. Both segments benefit because only a realtime voice agent can listen, interrupt, and score spoken behavior with word-level timestamps — a forms-and-database app or plain LLM chat window cannot observe the behavior it claims to coach.

Producing plan: winning_project_plan.md + assembly.manifest.json + disclosure.md via submit format. Acceptance: 3–5 paragraphs covering problem, solution, why AssemblyAI Path B + LLM Gateway + speechSynthesis, and B2C+B2B value.

## 4. Tech / category tags
AssemblyAI, Universal-3.5-Pro, Realtime STT, LLM Gateway, Voice Agent, Interview Prep

Producing plan: winning_project_plan.md tech stack. Acceptance: exact 6 tags in order, no extra.

## 5. Cover image
`assets/cover-16x9.png` — PNG/JPG 16:9 (DP-PITCH artifact) — acceptance: file exists, 16:9, PNG/JPG

Producing plan: DP-PITCH. Acceptance: assets/cover-16x9.png exists as 16:9 PNG/JPG (cover artifact from deck generation).

## 6. Video
`assets/demo-3-5min.mp4` — MP4 3-5 min (DP-PITCH artifact) — acceptance: mp4, 180–300s

Producing plan: DP-PITCH. Acceptance: assets/demo-3-5min.mp4 exists as MP4 180–300s.

## 7. Slides
`assets/slides.pdf` — PDF (DP-PITCH artifact) — acceptance: pdf exists

Producing plan: DP-PITCH. Acceptance: assets/slides.pdf exists as PDF.

## 8. Public GitHub repo URL
`https://github.com/<org>/<repo>` — must be public; contains no `private/` (verified by .gitignore), no .env tracked — acceptance: URL reachable, repo public

Producing plan: git hygiene via .gitignore private/ + no .env tracked. Acceptance: repo public and private/ not shipped.

## 9. Hosting platform
Vercel — (DP-DEPLOY) — acceptance: vercel.json present, `api/health.ts` live

Producing plan: DP-DEPLOY. Acceptance: vercel.json present with /health rewrite and Vercel framework vite.

## 10. Application URL
`https://<app>.vercel.app` — (DP-DEPLOY `PUBLIC_URL`) — acceptance: GET /health → 200, mic works on https

Producing plan: DP-DEPLOY PUBLIC_URL. Acceptance: GET https://<app>.vercel.app/health returns 200 and browser mic works on https.



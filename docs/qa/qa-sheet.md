<!-- Requirement IDs: FAQDEF-01..05, FAQDEF-RES-01 | Generated via fallback+verbatim -->
# FAQ Defense — Mockrill — Q&A Sheet

> Generated via faqdef generate + verbatim close-call answers (DP-PITCH §5 A6). Preparation checklist plus judge-proof answers.

## Presentation (q-01) — grounded: not_stated
Q: What specific user problem does the project address, and who feels it per your plan's Problem / Target Persona?
A: Not stated beyond headings — cite plan paragraph when defending.

## Business Value (q-02) — grounded: not_stated
Q: What TAM figure, revenue model, and why-AI one-liner are stated in winning_project_plan.md §## Business Value / ## Why Now?
A: Not stated beyond the plan's Business Value fields — quote the plan verbatim; do not invent a figure.

## Application of Technology (q-03) — grounded: partial
Q: Which chassis components are assembled per assembly.manifest.json, and what does PROV-05 say each one provides?
A: Components: resilience, platform, ideation, context, provenance — See architecture-summary.md (PROV-05).

## Originality (q-04) — grounded: not_stated
Q: How does the project steer away from the most predictable submissions for this theme per the prior-art / gallery check?
A: Not stated in winning_project_plan.md — reference the Idea framing worksheet (IDEA-03) gallery notes when defending.

## Sponsor-track placeholder (q-05) — grounded: not_stated
Q: Which sponsor tracks are active per event_profile.json / frontmatter sponsor_tracks, and how are they addressed?
A: Tracks: assemblyai-voice-agent-api, assemblyai-realtime-stt-api. Do not invent sponsor usage.

## Verbatim close-call answers

### 1. Why AssemblyAI and not any STT?
Q: Why AssemblyAI and not any STT?
A: Because only AssemblyAI streaming gives us word-level timestamps with end_of_turn / turn_is_formatted turn semantics — words[].start/end (ms from session start) plus turn_is_formatted and end_of_turn make timestamped evidence ("at 07:42 you said 'kind of' 3×") and natural barge-in possible. That is deterministic detection over words[].start/end, not an LLM quote. And the LLM Gateway keeps the whole stack on one key (ASSEMBLYAI_API_KEY). Literal socket params we use: wss://streaming.assemblyai.com/v3/ws with speech_model universal-3-5-pro, sample_rate 16000, encoding pcm_s16le, format_turns true, keyterms_prompt [role-specific terms], end_of_turn_confidence_threshold 0.4, vad_threshold 0.2, interruption_delay ~200 ms, mode balanced, plus GET https://streaming.assemblyai.com/v3/token for the short-lived browser token and POST https://llm-gateway.assemblyai.com/v1/chat/completions with JSON-Schema tools.

### 2. You chose Path B — isn't Path A the 'real' one?
Q: You chose Path B — isn't Path A the 'real' one?
A: The brief lists both as equal alternatives. The hosted Application URL required by field 10 needs a serverless deployment (Vercel static + three stateless functions), which cannot hold a long-lived socket — Audio never proxies through a serverless function. Path B puts MORE AssemblyAI surface in the shipped product, not less: streaming STT over WebSocket plus LLM Gateway JSON-Schema tool calling, both on the same ASSEMBLYAI_API_KEY, versus Path A which would hide orchestration behind one opaque connection.

### 3. How do I know the scorecard isn't hallucinated?
Q: How do I know the scorecard isn't hallucinated?
A: Evidence quotes come from deterministic detection over words[].start/end, never from the LLM. detectFillers(turn: TranscriptTurn) scans words[] for FILLER_LEXICON hits and buildEvidence maps those to EvidenceQuote {start_ms,end_ms}. mergeScores(llm, det) explicitly discards LLM-supplied quotes and keeps only deterministic evidence; the LLM only supplies axes/structure scores. So the timestamp you see is traceable to the socket Turn payload.

### 4. What's the business model / who exactly pays?
Q: What's the business model / who exactly pays?
A: Named user: junior bootcamp grads and career switchers in the first 12-24 weeks post-grad, 2-5 applications/week. They pay B2C $19/mo subscription for unlimited voice drills. Bootcamp career-services pay B2B per-seat licensing (e.g. $499/yr per seat, 20 seats avg per bootcamp) to offer Mockrill as part of tuition. Bottom-up arithmetic is on slide 05: ~90k US bootcamp grads/yr [estimate] + ~150k self-learners [estimate] = 240k addressable/yr; 15% willing => 36k; B2C 36k* $19*3 mo = $2.05M plus B2B 500 bootcamps*20*$499 = $4.99M => ~$7M ARR at 100%, SAM ~$700k at 10% — all inputs labelled [estimate].

### 5. What's original here — there are other interview bots?
Q: What's original here — there are other interview bots?
A: Overlapping prior art: evidence-backed voice agents with speaker+timestamp citations, and generic interview-prep bots that ask text questions. The differentiator is the re-drill loop: quote the exact moment ("at 07:42 you said ...") then make the candidate say it again better in the same session, on the same socket, with the same word-level timestamp evidence. The socket stays open; TurnController stays in scoring→drill; the LLM Gateway re-asks the weakest question (selectWeakest) and new words[].start/end are compared. No prior interview bot does quote-then-re-say on the same streaming session.



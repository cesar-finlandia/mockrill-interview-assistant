# Pitch Candidates — 3 candidates (grounded 0/3)

## pitch-01 — Junior Developer Screening Caller (persona: persona-01, —, —) — ungrounded ⚠️ — no external evidence, market validation required — score 7.2
- **Problem:** Bootcamp grad with <1 year experience dreads voice technical screens: freezes on follow-ups, filler words spike, and no affordable way to rehearse spoken answers under real turn-taking pressure before live phone/Zoom screens.
- **AI solution:** Mockrill-style voice coach built on AssemblyAI Voice Agent API (Path A) via single connection — Universal-3 Pro STT, LLM routing, VAD/turn-taking and JSON-Schema tool calling for rubric scoring — or fallback AssemblyAI Realtime STT API (Path B) over wss://streaming.assemblyai.com/v3/ws with universal-3-5-pro + BYO LLM/TTS; hosted on Vercel with HTTPS mic capture and GitHub repo.
- **Why now:** No, could not have been built two years ago with a form and DB — requires AssemblyAI sub-second realtime voice turn-taking, VAD and word-level timestamps with turn_is_formatted that were not feasible at consumer latency/price. (IDEA-02 filter)
- **Evidence (paraphrased):** —, — — No external grounding — market validation required manually (IDEA-01/03) *(never full verbatim)*
- **Illustrative quote:** none
- **Predictability:** High gallery density for interview bots; differentiation is timestamp-quoted evidence ('at 07:42 you said...') + live re-drill vs generic Q&A chatbot. Best fit: main AssemblyAI prize pool (5 winners x $1k cash + $1k credits, Tracks TBA) via Path A. Manual gallery scan required. (does not replace IDEA-03 manual gallery scan)

## pitch-02 — Language Learning Shadowing Partner (persona: persona-02, —, —) — ungrounded ⚠️ — no external evidence, market validation required — score 6.8
- **Problem:** Adult language learner can read and write but freezes in spontaneous spoken conversation: lacks patient native speaker to correct pronunciation, pacing and filler use in real time without judgment.
- **AI solution:** Conversational shadowing partner on AssemblyAI Voice Agent API (Path A) single connection with Universal-3 Pro STT, multilingual recognition, VAD/turn-taking and JSON-Schema tool calling for error tagging, or AssemblyAI Realtime STT API (Path B) over wss://streaming.assemblyai.com/v3/ws model universal-3-5-pro + BYO LLM/TTS; deployed to HTTPS browser for mic access.
- **Why now:** No, could not have been built two years ago with a form and DB — needs AssemblyAI realtime multilingual STT with turn-taking and word-level timestamps to interrupt and score spoken pronunciation live. (IDEA-02 filter)
- **Evidence (paraphrased):** —, — — No external grounding — market validation required manually (IDEA-01/03) *(never full verbatim)*
- **Illustrative quote:** none
- **Predictability:** Language tutors common; differentiate with live phoneme-level timestamp citations and barge-in correction vs flashcard chat. Best fit: main AssemblyAI prize pool (5 winners x $1k cash + $1k credits, Tracks TBA) Path A. Manual gallery scan required. (does not replace IDEA-03 manual gallery scan)

## pitch-03 — Customer Service De-escalation Trainee (persona: persona-03, —, —) — ungrounded ⚠️ — no external evidence, market validation required — score 6.5
- **Problem:** New customer service agent handles angry callers by reading scripts: struggles with interruptions, tone control and policy recall under live voice pressure, leading to escalations and QA failures.
- **AI solution:** Angry-caller simulator using AssemblyAI Voice Agent API (Path A) — Universal-3 Pro STT, LLM routing/voice output, VAD/turn-taking, JSON-Schema tool calling for policy-check and empathy scoring — or AssemblyAI Realtime STT API (Path B) over wss://streaming.assemblyai.com/v3/ws universal-streaming/universal-3-5-pro + BYO LLM/TTS; hosted URL + repo per submission gate.
- **Why now:** No, could not have been built two years ago with a form and DB — requires AssemblyAI realtime voice turn-taking, VAD and word-level timestamps with turn_is_formatted that were not feasible at consumer latency/price. (IDEA-02 filter)
- **Evidence (paraphrased):** —, — — No external grounding — market validation required manually (IDEA-01/03) *(never full verbatim)*
- **Illustrative quote:** none
- **Predictability:** Customer service simulators common; differentiation is live interruption handling with timestamped policy and tone feedback vs script chatbot. Best fit: main AssemblyAI prize pool (5 winners x $1k cash + $1k credits, Tracks TBA) via Path A. Manual gallery scan required. (does not replace IDEA-03 manual gallery scan)

<!-- traceability: input_mined_hash=fdc1c6e385cdf5c63c06ec121d1401c0d379aebd2a18273f57881663e96bdd66 | requirement IDs: PGM-07 PGM-08 IDEA-02 -->

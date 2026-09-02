---
marp: true
theme: chassis
---

# AssemblyAI Usage

<!-- SLOT 07 -->
## AssemblyAI Usage — Universal-3.5-Pro streaming + LLM Gateway (Application of Technology)

**Streaming STT:** `wss://streaming.assemblyai.com/v3/ws`
- `speech_model: universal-3-5-pro` (literal)
- `sample_rate: 16000`
- `encoding: pcm_s16le`
- `format_turns: true` (boolean literal shown)
- `keyterms_prompt: string[] (e.g. ["STAR","React","system design"])`
- `end_of_turn_confidence_threshold: 0.4`
- `min_turn_silence, max_turn_silence: 1536 ms default`
- `vad_threshold: 0.2`
- `interruption_delay: (0-1000 ms) e.g. 200 ms`
- `mode: balanced`
- Billing: socket-open duration; always send `{type:"Terminate"}`

**Token:** `GET https://streaming.assemblyai.com/v3/token` `expires_in_seconds 1-600`

**LLM Gateway:** `POST https://llm-gateway.assemblyai.com/v1/chat/completions` with `model claude-sonnet-4-6` primary, `qwen3.5-4b-32k-fast` fallback, `tools [{type:"function"...}]`, `tool_choice`
- JSON-Schema tool calling: `select_question`, `score_answer`, `tag_filler`

**Voice output:** `window.speechSynthesis` (no TTS vendor)

**Path B equals Path A as equal alternatives; hosted URL needs serverless which cannot hold long-lived socket.**

<!-- /SLOT 07 -->

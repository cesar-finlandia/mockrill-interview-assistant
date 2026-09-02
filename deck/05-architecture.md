---
marp: true
theme: chassis
---

# Architecture — How it works

<!-- SLOT 06 -->
Engine-layer spec for planner pipeline: capture mic → AssemblyAI Voice Agent API (or Realtime STT WebSocket wss://streaming.assemblyai.com/v3/ws + BYO LLM/TTS) streaming 16-bit mono PCM (or AAC) with VAD; LLM routing via JSON-Schema tools (select_question, score_answer, tag_filler); TTS voice output; client handles barge-in and turn_is_formatted finalization. Data flow: audio chunks → Turn events → LLM tool calls → rubric store → scorecard renderer quoting words[start,end] timestamps. UI states: pre-call setup, live transcript ticking, scorecard (timestamp quotes + re-drill button), history. Prompt boundaries: deconstruction/synthesis prompts domain-free; domain enters via brief/catalog only. Corpus needs: role-specific question banks (STAR, behavioral), scoring rubrics, filler-word lexicon. Contracts: MediaMessage shape for STT, DegradedResult for resilience fallback (golden cached Turns). No fixed Engine topology pre-decided — capability boundary only.

Module emphasis (advisory): Consider media/stt as primary ingestion (Universal-3 Pro) and media/tts for Path B; resilience wrapper on every AssemblyAI WebSocket/TTS call with timeout 15000ms, retries 1, fallback chain cache→none, plus RES_FORCED_DEGRADED kill switch. Context buffer for long voice conversations to avoid token overflow. Cost guardrail around every LLM/tool call. Platform transport (TRN) + mock envelopes for live transcript ticking UI, deploy via Vercel (VERCEL_TOKEN/PROJECT_ID, HTTPS for mic). Provenance disclosure via PROVO. Ideation deck/script/FAQ/demodrive for pitch. These are advisory suggestions only — the Assembly Advisory module decides the manifest; do not embed manifest_version/included/components blocks here.

![architecture diagram](./diagram.mmd)

```mermaid
graph TD
  RESILIENCE["RESILIENCE<br/>Generic `withResilience` wrapper + `DegradedResult` + golden cache (`RES-*`)."]
  PLATFORM["PLATFORM<br/>One-command deploy (`DEP`), typed streaming bus (`TRN`), 3 distinct UI themes (`UI`). requires_env applies when platform/deploy included; provider swappable via DEPLOY_PROVIDER config."]
  IDEATION["IDEATION<br/>PIT deck skeleton, IDEA worksheet, RETRO template + 4 Hour 48–72 auto-populators `ideation/deckgen/script/demodrive/faqdef`. OPENAI_API_KEY required by deckgen/script/faqdef; demodrive optionally needs PLAYWRIGHT."]
  CONTEXT["CONTEXT<br/>Provider-agnostic message buffer + pluggable token counter (`CTX-*`)."]
  PROVENANCE["PROVENANCE<br/>Disclosure generator (`prov`) + submission formatter + repo hygiene guard (`submit`)."]
  RESILIENCE --> PLATFORM
  CONTEXT --> PLATFORM
  RESILIENCE --> IDEATION
  PROVENANCE --> IDEATION
  RESILIENCE --> CONTEXT
  RESILIENCE --> PROVENANCE
  PLATFORM --> PROVENANCE
  RESILIENCE -.->|EventEnvelope TRN-01| PLATFORM

  classDef chassis fill:#6AE3FF,stroke:#F2F2F2,color:#0F1115;
  class RESILIENCE,PLATFORM,IDEATION,CONTEXT,PROVENANCE chassis

  subgraph Legend
    direction LR
    L1["Manifest 1.0.0<br/>chassis v0.0.0-<br/>generated 2026-09-01"]
  end
```
<!-- /SLOT 06 -->

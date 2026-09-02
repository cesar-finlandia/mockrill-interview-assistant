# Provenance & Disclosure

> Generated from `assembly.manifest.json` — do not hand-edit accuracy; polish wording only if needed. Verbatim reuse by DECKGEN-02 / SUBMIT-02 / FAQDEF-02 (contract 8).

This project reuses **5** component(s) from the Hackathon Chassis Repository (`v0.0.0-` / `LICENSE: MIT`).

## Reused components (5)

- **resilience** — Resilience & Demo-Proofing Layer (`RES-*`) — Generic `withResilience` wrapper + `DegradedResult` + golden cache.
- **platform** — Platform Layer (`DEP/TRN/UI`) — One-command deploy, typed streaming bus, 3 distinct UI themes.
- **ideation** — Ideation & Pitch Tooling (`PIT/IDEA/RETRO`) — PIT deck skeleton, IDEA worksheet, RETRO template + 4 Hour 48–72 auto-populators `ideation/deckgen/script/demodrive/faqdef`.
- **context** — Context & Conversation Buffer (`CTX-*`) — Provider-agnostic message buffer + pluggable token counter.
- **provenance** — Provenance & Disclosure (`PROV/SUBMIT`) — Disclosure generator (`prov`) + submission formatter + repo hygiene guard (`submit`).

## AI assistance

- **cursor** — code-generation
- **vite-node** — cli-execution
- **assemblyai** — stt-llm-tts

## How to cite

Cite the chassis repository as prior scaffolding per `XCUT-01` / `LICENSE`. Full disclosure source: `assembly.manifest.json` (`manifest_version 1.0.0`, `chassis_version v0.0.0-unresolved`).

_Generated at 2026-09-02T01:41:55.250Z from manifest hash fb29ef1ef4e5d826fb400d69f0545253cf056ed0c5d52a6b96ce0068966dd251._
---
## Operator disclosure (added manually, not generated)
- Pre-built non-AI scaffolding: the five included chassis modules `resilience`, `platform`, `context`, `ideation`, `provenance` — author's own open-source scaffolding, reused and disclosed.
- Built inside Sep 1-30 window: everything under `engine/`, `src/mockrill/`, `api/`, the prompts, the question bank (`engine/rag/question-bank.json`), the dialogue policy, the scoring rubric (`src/mockrill/scoring/*`).
- Deliberate technology choices: Path B with browser connecting directly to AssemblyAI streaming (`wss://streaming.assemblyai.com/v3/ws` with short-lived token from `GET /api/aai-token`), AssemblyAI LLM Gateway for orchestration (`POST https://llm-gateway.assemblyai.com/v1/chat/completions` with JSON-Schema tool calling, model `claude-sonnet-4-6` fallback `qwen3.5-4b-32k-fast`), and browser `speechSynthesis` for voice output instead of a TTS vendor (no second key, no second API).
- Rule Book's explicit scaffold-disclosure clause was `[unconfirmed]` at kickoff and disclosing regardless is the safe choice.

<!-- pre-built non-AI scaffolding verification helper -->

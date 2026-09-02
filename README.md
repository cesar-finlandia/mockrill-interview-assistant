# Mockrill — Realtime AI Mock-Interview Voice Coach

Junior bootcamp graduates rehearse spoken technical screens with a realtime voice agent that quotes exact moments (07:42) and re-drills the weakest answer by voice; why AI why now: only realtime voice can observe spoken behavior it coaches.

## Quickstart (90 seconds)

```sh
npm ci
cp .env.example .env   # then set ASSEMBLYAI_API_KEY in .env
npm run dev             # or npm run build && npm run preview
```

Open http://localhost:5173. The dev server serves the UI **and** the three serverless routes
(`/api/aai-token`, `/api/turn`, `/health`), so the whole app runs locally.

### Try it without a key or a microphone

Append `?sim=1` to any URL — local or deployed:

    http://localhost:5173/?sim=1

The microphone and the AssemblyAI socket are replaced by a replay of
`fixtures/mockrill/session-golden.json`; everything else (turn-taking, `/api/turn`, scoring,
the scorecard, the re-drill loop) is the real code path. No permission prompt, no credential,
no cost. Without `?sim=1` and without a working key the app detects that at startup and falls
back to the same replay with a **degraded** badge explaining why.

## Hosted URL

`https://<app>.vercel.app` — production deployment (PUBLIC_URL from DP-DEPLOY). Placeholder before deploy: `https://mockrill.vercel.app` — deployed URL after npm run deploy.

## Testing

```sh
npm run typecheck      # tsc --noEmit
npm run test:mockrill  # 42 unit tests
npm run test:e2e       # browser E2E: 29 Playwright tests across 3 projects
npm run test:all       # all three, in order
```

The E2E suite drives a real Chromium through every use case — setup, the live call, scoring,
the evidence-backed scorecard, the re-drill loop, the degraded ladder, the SSE replay and the
production bundle. Strategy, the requirement→spec coverage matrix and the runbook are in
[`design_documents/e2e-testing/`](design_documents/e2e-testing/). Playwright starts every
server it needs; `npx playwright install chromium` once first.

The live AssemblyAI path (`tests/e2e/live.spec.ts`) skips itself unless `ASSEMBLYAI_API_KEY`
is set, because it mints a real token and opens a real, billed socket.

## Architecture

![Architecture](docs/architecture.png)

See `docs/chassis-modules.mmd` for module provenance (the two diagrams are complementary — runtime data flow vs module provenance).

## Offline demo (no key)

```sh
npm run build
npm run preview &                 # http://localhost:4173
npm run mock:publish              # SSE replay on :8787, proxied to /events/stream
open http://localhost:4173/?source=stream
```

`npm run mock:publish` replays `fixtures/mockrill/session-golden.json` via SSE at `:8787/events/stream` and the app at `http://localhost:4173?source=stream` renders the same screens without a live key.

## AssemblyAI features used (Application-of-Technology evidence)

- Streaming STT (AssemblyAI Realtime): `speech_model: universal-3-5-pro`, `sample_rate: 16000`, `encoding: pcm_s16le`, `format_turns`, `end_of_turn_confidence_threshold: 0.4`, `vad_threshold: 0.2`, `min_turn_silence`, `max_turn_silence: 1536`, `interruption_delay`, `mode: balanced`, `keyterms_prompt`
- Token: `GET https://streaming.assemblyai.com/v3/token` with `Authorization: <ASSEMBLYAI_API_KEY>` and `expires_in_seconds` (1–600 short-lived token minted by `GET /api/aai-token`)
- LLM Gateway: `POST https://llm-gateway.assemblyai.com/v1/chat/completions` with `model: claude-sonnet-4-6` fallback `qwen3.5-4b-32k-fast`, `tools` JSON-Schema, `tool_choice`
- Voice output: `window.speechSynthesis` (no TTS vendor)

## License

MIT — see LICENSE (2026 Mockrill Contributors)

## Disclosure

See disclosure.md (generated via provo) and architecture-summary.md

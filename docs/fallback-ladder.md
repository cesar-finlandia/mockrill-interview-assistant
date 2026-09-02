# Fallback Ladder — Mockrill Demo

**Rule: present at the highest rung that works and never apologize downward**

This runbook defines the 4-rung fallback ladder for the Mockrill demo. If a rung fails, drop to the next rung that works.

## The 4 Rungs

| Rung | What the judge sees | Trigger/Precondition | Exact commands | Presenter sentence |
|------|---------------------|----------------------|----------------|---------------------|
| Rung 1 — Live | judge's own voice -> live transcript -> scorecard quoting their words | default | `npm run dev` + open deployed URL `https://...vercel.app` | "Speak and I'll score your answer live — watch the transcript, then the evidence-backed scorecard." |
| Rung 2 — Degraded live | same URL same UI, instant golden-session data, amber "cached session" banner | RES_FORCED_DEGRADED=1 | `RES_FORCED_DEGRADED=1 npm run dev` (local) or flag on Vercel env | "We're running on the cached golden session so you can see the scorecard shape instantly — same UI, same data contract, no network." |
| Rung 3 — Recorded capture | pre-recorded DEMODRIVE capture narrated live | network dead, laptop fine | `npx vite-node src/ideation/demodrive/cli.ts capture` (or `npm run demodrive:record`) — capture recorded in week 4 | "Here's the DEMODRIVE capture from week 4, running now — I'll narrate the transcript and evidence as it ticks." |
| Rung 4 — Localhost sync render | full UI ticking from mock envelopes, zero network | zero network | `npm run dev` + `npm run mock:publish` (or `npm run build` + `npm run preview` + `npm run mock:publish` then open `http://localhost:4173/?source=stream`) | "And here it is running entirely offline — the mock publisher is replaying golden envelopes locally via SSE." |

## Per-Rung Detail

### Rung 1 — Live
- **Precondition:** Network live, deployed URL reachable, microphone permission granted, `ASSEMBLYAI_API_KEY` valid.
- **Exact commands (copy-pasteable):**
  ```sh
  npm run dev
  # open https://...vercel.app
  ```
- **What the judge sees:** Judge's own voice -> live transcript (word-level timings) -> scorecard quoting their words with EvidenceQuote labels and filler/pause evidence.
- **Presenter sentence:** "Speak and I'll score your answer live — watch the transcript, then the evidence-backed scorecard."
- **Fallback rule:** If live streaming fails (mic denied, token 503, network drop), drop to Rung 2; present at the highest rung that works and never apologize downward.

### Rung 2 — Degraded live
- **Precondition:** Any network/LLM failure, or demo forcing via kill switch; golden cache populated (6 explicit keys: `mockrill-aai-token`, `mockrill-session-golden`, `mockrill-turn-01`..`04`).
- **Exact commands (copy-pasteable):**
  ```sh
  RES_FORCED_DEGRADED=1 npm run dev
  # or set RES_FORCED_DEGRADED=1 in Vercel env and redeploy
  ```
- **What the judge sees:** Same URL, same UI, instant golden-session data (4 turns, 5 actions, scorecard with `at 07:42 you said 'kind of' 3×`), amber "cached session" banner indicating degraded cache serve.
- **Presenter sentence:** "We're running on the cached golden session so you can see the scorecard shape instantly — same UI, same data contract, no network."
- **Fallback rule:** If degraded banner does not appear, verify `createGoldenCache().has` for all 6 keys; if cache miss, regenerate fixture or re-record golden; otherwise drop to Rung 3; present at the highest rung that works and never apologize downward.

### Rung 3 — Recorded capture
- **Precondition:** Network dead, laptop fine; DEMODRIVE capture recorded in week 4 exists.
- **Exact commands (copy-pasteable):**
  ```sh
  npx vite-node src/ideation/demodrive/cli.ts capture
  # or
  npm run demodrive:record
  ```
- **What the judge sees:** Pre-recorded DEMODRIVE capture playing back narrated live — transcript ticks, evidence and scorecard appear as in the capture.
- **Presenter sentence:** "Here's the DEMODRIVE capture from week 4, running now — I'll narrate the transcript and evidence as it ticks."
- **Fallback rule:** If capture file missing, regenerate via DEMODRIVE or drop to Rung 4; present at the highest rung that works and never apologize downward.

### Rung 4 — Localhost sync render
- **Precondition:** Zero network (external network disabled); local build artifacts present; mock publisher available.
- **Exact commands (copy-pasteable):**
  ```sh
  npm run dev &
  npm run mock:publish
  # alternative offline build proof:
  npm ci && npm run build && npm run preview
  npm run mock:publish
  # then open http://localhost:4173/?source=stream
  ```
  Publisher: `mockrill-mock-publish` listening on `http://localhost:8787` (default port 8787, override via `--port`).
- **What the judge sees:** Full UI ticking from mock envelopes via SSE (`GET /events/stream` and fallback `GET /events` returning `publisher.collect()`), zero external network — transcript ticks, `CitationDisplay` shows `07:42` evidence, scorecard renders.
- **Presenter sentence:** "And here it is running entirely offline — the mock publisher is replaying golden envelopes locally via SSE."
- **Fallback rule:** If port 8787 taken, use `--port <n>`; if fixture missing, run `npx vite-node fixtures/mockrill/generate-golden.ts`; present at the highest rung that works and never apologize downward.

## Rehearsal Log

A rung that has never been rehearsed is not a rung.

Rungs 2 and 4 must be rehearsed at least once per week from week 2, result recorded as dated line.

| Date | Rung 2 rehearsed? | Rung 4 rehearsed? | Notes | Operator |
|------|-------------------|-------------------|-------|----------|
| 2026-09-03 | yes | yes | both rungs rehearsed; rung 2 amber banner confirmed, rung 4 transcript ticked via ?source=stream | initial |
| 2026-09-02 | yes | yes | pre-flight check: RES_FORCED_DEGRADED=1 served golden session, mock publisher replayed on 8787 via SSE | mechanical |

## Quick Commands

```sh
# Generate golden fixture (M42)
npx vite-node fixtures/mockrill/generate-golden.ts

# Start mock publisher (M43) — mockrill-mock-publish on 8787
npm run mock:publish
npm run mock:publish -- --fast --port 8787 --fixture fixtures/mockrill/session-golden.json --loop

# Probe publisher endpoints
curl http://localhost:8787/events
curl http://localhost:8787/events/stream

# Rung 2 degraded live
RES_FORCED_DEGRADED=1 npm run dev

# Rung 4 offline build proof (NFR-08)
npm ci && npm run build && npm run preview
# then in another terminal:
npm run mock:publish
# open http://localhost:4173/?source=stream

# Golden-cache recording — six explicit keys (--key)
npx vite-node src/resilience/scripts/record-golden.ts --provider assemblyai --model universal-3-pro --input /tmp/mockrill-aai-token.req.json --output /tmp/mockrill-aai-token.res.json --key mockrill-aai-token --source mock
npx vite-node src/resilience/scripts/record-golden.ts --provider mockrill --model session --input /tmp/mockrill-session-golden.req.json --output /tmp/mockrill-session-golden.res.json --key mockrill-session-golden --source mock
npx vite-node src/resilience/scripts/record-golden.ts --provider assemblyai --model claude-sonnet-4-6 --input /tmp/mockrill-turn-01.req.json --output /tmp/mockrill-turn-01.res.json --key mockrill-turn-01 --source mock
npx vite-node src/resilience/scripts/record-golden.ts --provider assemblyai --model claude-sonnet-4-6 --input /tmp/mockrill-turn-02.req.json --output /tmp/mockrill-turn-02.res.json --key mockrill-turn-02 --source mock
npx vite-node src/resilience/scripts/record-golden.ts --provider assemblyai --model claude-sonnet-4-6 --input /tmp/mockrill-turn-03.req.json --output /tmp/mockrill-turn-03.res.json --key mockrill-turn-03 --source mock
npx vite-node src/resilience/scripts/record-golden.ts --provider assemblyai --model claude-sonnet-4-6 --input /tmp/mockrill-turn-04.req.json --output /tmp/mockrill-turn-04.res.json --key mockrill-turn-04 --source mock
```

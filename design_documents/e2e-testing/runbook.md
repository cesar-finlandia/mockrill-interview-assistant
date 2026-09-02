# E2E runbook

## Prerequisites

```bash
npm ci
npx playwright install chromium
```

Node ≥ 20. No API key is needed for the default suites — `?sim=1` replays
`fixtures/mockrill/session-golden.json` and the interviewer degrades deterministically when
`ASSEMBLYAI_API_KEY` is unset.

## The gate

```bash
npm run test:all
```

Runs, in order: `tsc --noEmit` → 42 unit tests → all three Playwright projects. This is the
command that must be green before a deploy or a submission edit.

## Individual suites

Playwright starts and stops every server it needs (`webServer` in `playwright.config.ts`):
the Vite dev server on 5173, the SSE mock publisher on 8787, and a `vite build` +
`vite preview` on 4173. Locally it reuses one that is already listening.

```bash
npx playwright test --project=app
```
The main suite — setup, interview, scorecard, drill, resilience — against the dev server.

```bash
npx playwright test --project=replay
```
Ladder rung 4: the UI driven purely by replayed SSE envelopes.

```bash
npx playwright test --project=built
```
The production bundle served by `vite preview`.

```bash
npx playwright test --project=app drill.spec
npx playwright test --headed --project=app interview.spec
npx playwright test --ui
```
One file, watch it happen, or the interactive runner.

```bash
npx playwright show-report .playwright-report
```
The HTML report (written on CI, or after a failure with `--reporter=html`).

## The live path (costs credits)

`live.spec.ts` skips itself unless a key is present. Run it deliberately, before rehearsing:

```bash
ASSEMBLYAI_API_KEY=<key> npx playwright test --project=app live.spec
```

It mints a real short-lived token and opens one real socket. The socket is terminated on
teardown; billing is on socket-open duration, so do not leave it running.

## Rehearsing the fallback ladder

The blueprint's rule is that a rung which has never been rehearsed is not a rung. Each maps to
a command:

| Rung | What the judge sees | Command |
|---|---|---|
| 1 — Live | Judge talks into their own mic on the public URL | `ASSEMBLYAI_API_KEY=… npx playwright test --project=app live.spec`, then open `$PUBLIC_URL` |
| 2 — Degraded live | Same URL, golden session, degraded badge with its cause | `npx playwright test --project=app resilience.spec` — or set `RES_FORCED_DEGRADED=1` in the deployment env and reload |
| 3 — Recorded capture | The DEMODRIVE screenshots/video | `npm run demodrive -- --script demodrive-script.json --data-source mock --out assets/demodrive` |
| 4 — Localhost replay | Full UI ticking from mock envelopes, no network | terminal 1 `npm run dev`, terminal 2 `npm run mock:publish`, open `http://localhost:5173/?source=stream` — asserted by `npx playwright test --project=replay` |

A fifth, judge-facing convenience: `?sim=1` on any origin runs a complete interview with no
microphone permission and no key.

## Manual smoke on the deployed URL

After `npm run deploy`:

```bash
curl -fsS "$PUBLIC_URL/health"
npm run deploy:verify
```

Then, in a browser, on the deployed origin:

1. `$PUBLIC_URL/?sim=1` — a full interview with no mic prompt. Scorecard shows evidence
   quotes with `mm:ss` labels; **Re-drill this answer** produces a before/after table.
2. `$PUBLIC_URL/` — allow the microphone, speak an answer, confirm the transcript ticks and
   the interviewer speaks back. If the badge appears instead, you are on rung 2 and the
   demo still works.

## Troubleshooting

**`504 Outdated Optimize Dep` on the first page load.** Two Vite servers sharing one dep
cache. The preview API loader uses `node_modules/.vite-preview-api` to avoid this; if it
recurs, `rm -rf node_modules/.vite node_modules/.vite-preview-api` and restart.

**Ports busy.** The suite needs 5173, 4173 and 8787. Stop stale servers before running, or
set `CI=1` so Playwright refuses to reuse one and fails loudly instead of testing the wrong
build.

**The interview stalls on the first question.** The state machine is stuck in `speaking`.
That is the T4 regression (`speaking → listening` on utterance end) — see
`coverage-matrix.md` §3 row 2. Check `finishSpeaking()` still runs in every branch of
`handleBegin` / `handleFinal`.

**`ajv validation requires a Node runtime (RES-04)` in the browser console.** The
`installBrowserNodeCompat()` call in `src/mockrill/ui/main.tsx` was removed or is running too
late. Without it the chassis cannot validate envelopes and the SSE path dies.

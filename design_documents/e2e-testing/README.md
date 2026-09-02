# Mockrill — End-to-End Testing Strategy

**Status:** binding for `tests/e2e/`.
**Scope:** every use case in the master blueprint (`private/design_documents/master_blueprint_entry.md` §1) and the ten design plans, exercised through a real browser.

| Document | Purpose |
|---|---|
| `README.md` (this file) | Strategy: what we test, why, how, and what "green" means |
| `coverage-matrix.md` | Every FR/NFR mapped to the spec that proves it |
| `runbook.md` | How to run each suite, locally and before the demo |

---

## 1. What this application has to get right

Mockrill is a realtime voice mock-interview coach. Stripped to its use cases, a candidate:

1. **Sets up a call** — picks a role, checks the microphone works, starts (FR-10).
2. **Talks to an interviewer** — the interviewer speaks a question aloud, mutes itself while
   speaking, listens, and the transcript ticks in live (FR-01, FR-03, FR-04, FR-10).
3. **Gets scored per answer** — one interviewer request per turn, JSON-Schema tool calls,
   deterministic filler detection layered on top (FR-05, FR-06, FR-08, NFR-05).
4. **Reads an evidence-backed scorecard** — quotes of their own words at `mm:ss`, filler
   counts, per-axis scores, weakest answer identified (FR-07, FR-09).
5. **Re-drills the weakest answer by voice, in the same session** — the differentiator
   (FR-09).
6. **Sees their history** (FR-10).

And, on demo day, a judge:

7. **Opens a public HTTPS URL** and it responds (FR-12).
8. **Still sees a complete interview** when the mic is blocked, the key is missing, or the
   venue Wi-Fi dies — at the highest rung that works, never with an apology (FR-13).

Everything in `tests/e2e/` exists to prove one of those eight sentences.

## 2. Why browser E2E, and not more unit tests

The unit suite (`npm run test:mockrill`, 42 tests) already covers the pure logic well: filler
lexicon, evidence building, rubric maths, scorecard aggregation, envelope construction, state
transitions against stub dependencies. It passed while the application did not work at all.

That is the point. The failures that actually cost this entry are **integration** failures,
and every one of them is invisible to a unit test:

- The React tree rendered a placeholder shell and never mounted the real `Setup` / `LiveCall`
  screens — every screen's own unit test passed.
- The turn state machine never transitioned out of `speaking`, because the transition was
  reachable only from a `_test`-prefixed seam. Its unit test drove that seam directly.
- The `StreamingClient` callbacks were never wired to the controller's handlers; nothing owned
  the wiring, so nothing tested it.
- The chassis event transport imports `node:crypto` / `node:fs` and needs `node:module` for
  ajv. In Node — the unit environment — all three resolve. In a browser, the first envelope
  threw.
- The scorecard was hand-rolled inside the controller with `overall: 0` instead of calling the
  scoring module the unit tests were exercising.

The common shape: **each module was correct and the composition was not.** A test can only
catch that if it drives the composed artefact the way a user does — a real browser, a real
DOM, real HTTP to the real route handlers, real bundling. So the top-level contract of this
suite is:

> A test asserts on what the app *renders* and on the *envelopes it publishes*, never on a
> module's internals. The only seam is `window.__mockrill`, and it exposes exactly the event
> log the screens themselves render from.

## 3. What is simulated, and why exactly that

Two things cannot run in a headless browser on CI: a **microphone** and a **billed AssemblyAI
socket**. Simulating anything more would start hiding the bugs above; simulating anything less
makes the suite unrunnable and expensive.

So `?sim=1` swaps exactly two objects, both behind their real interfaces
(`src/mockrill/voice/simSession.ts`):

| Seam | Real | Simulated | Still real in sim |
|---|---|---|---|
| `MicSource` | `getUserMedia` + AudioWorklet → PCM s16le 16 kHz | timer emitting PCM frames of the same shape | mute discipline, chunk forwarding, barge-in peak logic |
| `StreamingClient` | `wss://streaming.assemblyai.com/v3/ws` | `fixtures/mockrill/session-golden.json` replayed as Begin / partial Turn / formatted final Turn | the turn state machine, `/api/turn`, scoring, scorecard, drill, every screen |

Two properties make this honest rather than a mock-shaped hole:

- **The replay is driven by the app, not by a timer.** The sim client emits its next partial
  only when the controller calls `sendAudio()` — which only happens when the controller has
  actually unmuted after speaking. The regression that broke the app (never leaving
  `speaking`) fails this suite by hanging, exactly as it would in production.
- **Turn payloads are the real AssemblyAI shape**, word timestamps and all, so `FR-03`,
  `FR-07` and `FR-08` are tested against the same data the live socket delivers.

The live socket is not left untested — it is a separate suite (§4, `live.spec.ts`) that is
skipped without a key and run deliberately before the demo.

## 4. The suites

Three Playwright projects, because "it works" means three different things.

### `app` — the dev server (default)

`vite` serves the UI *and* the three `api/*.ts` handlers through Vite's SSR loader, so the
routes under test are the same TypeScript sources Vercel runs.

| Spec | Use case | Key assertions |
|---|---|---|
| `setup.spec.ts` | 1 | roles come from the question bank, start is gated on a role, mic check reports ready, theme switch flips `data-theme`, no credential reachable from the page |
| `interview.spec.ts` | 2, 3 | partials tick then a **formatted** `end_of_turn` turn finalizes with word-level ms timestamps; the transcript is on screen; every score is attributed to a question that was actually asked and no question is scored twice; **exactly one `/api/turn` per candidate turn**; measured `end_of_turn → speech` p50 ≤ 2000 ms; mic muted at question time; every envelope well-formed and sequence-ordered |
| `scorecard.spec.ts` | 4 | every evidence label matches `mm:ss` **and** agrees with its own `start_ms`; a repeated filler is reported with its count; a re-run yields byte-identical numbers (determinism); the weakest answer is the lowest-scoring one and offers exactly one re-drill button; the session lands in history |
| `drill.spec.ts` | 5 | `drill-start` fires for the weakest question; **one `session-start` and zero extra token mints** across the drill (this is what "same session, no reconnect" means operationally); the retry is transcribed and re-scored **against the drilled question**; the before/after table shows all four axes |
| `resilience.spec.ts` | 7, 8 | `/health` → 200 `{ok:true}`; `/api/aai-token` is 200-with-token or 503-with-`DegradedResult`, never a 500 and never echoing the key; `/api/turn` always returns a usable action; no credential in any served script; **rung 2**: with no working token the app degrades to the golden session, shows the badge with its cause, and still produces a scorecard; **zero uncaught errors** across a whole session |
| `live.spec.ts` | 2 (rung 1) | *skipped without `ASSEMBLYAI_API_KEY`*: token is short-lived; the browser opens `wss://streaming.assemblyai.com/v3/ws` with `universal-3-5-pro`, 16 kHz, `pcm_s16le`, `format_turns=true`; the socket goes browser→AssemblyAI and **not** through our origin (R-06); the machine reaches a listening state |

### `replay` — SSE mock envelopes (`replay.spec.ts`)

`?source=stream` + `npm run mock:publish`. Proves FR-11 (the UI renders identically from a
replayed stream) and ladder rung 4: **zero token mints, zero `/api/turn` calls, no socket to
assemblyai.com**, and the same envelope contract as the live bus.

### `built` — the production bundle (`built.spec.ts`)

`vite build` → `vite preview`. Proves NFR-08 and catches bundling regressions — an
externalized node builtin, a dead alias, a tree-shaken side effect — on the artefact that
actually deploys, rather than an hour before the deadline on the Vercel URL.

## 5. Rules for writing and fixing tests

1. **Assert on rendered output and on envelopes.** Never on a module's internal state.
2. **Poll, never sleep.** `expect.poll` / `toBeVisible` with explicit timeouts; a fixed
   `waitForTimeout` hides a slow path instead of measuring it.
3. **Derive expectations from the source of truth.** Role lists come from the question bank;
   the weakest question is recomputed from the scorecard, not hard-coded.
4. **Every test names the requirement it proves** in a comment. A test that cannot name one is
   either redundant or is testing an accident of the implementation.
5. **When a test fails, the blueprint decides who is wrong.** Master blueprint → design plan →
   and where those are silent or contradictory, the user's use case in §1 of this document.
   Fix the code when the behaviour is wrong for the candidate; fix the test when it encodes an
   implementation detail the blueprint never promised. Both happened during the first green
   run — see `coverage-matrix.md` §3.

## 6. Definition of done

```
npm run typecheck      # tsc --noEmit, zero errors
npm run test:mockrill  # 42 unit tests, all pass
npm run test:e2e       # all three Playwright projects green
```

`npm run test:all` runs the three in order. Green means: every row of `coverage-matrix.md` has
at least one passing spec, the production bundle runs a complete interview with no uncaught
error, and rungs 2 and 4 of the fallback ladder each produce a full scorecard with no network
beyond localhost.

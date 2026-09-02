# Coverage matrix

Every functional and non-functional requirement from the master blueprint (§1.1, §1.2) mapped
to the browser spec that proves it. `tests/mockrill/` is the unit suite; `tests/e2e/` is the
browser suite. A requirement is covered only when a **browser** spec exercises it, except
where the "browser-unreachable" column says why it cannot be.

## 1. Functional requirements

| ID | Requirement (abbreviated) | Browser spec | Unit backup |
|---|---|---|---|
| FR-01 | Mic captured as PCM s16le 16 kHz mono over HTTPS | `setup.spec.ts` (device check), `interview.spec.ts` (`mic-capture` payload `sample_rate: 16000`), `live.spec.ts` | — |
| FR-02 | Stream to `v3/ws` with `universal-3-5-pro`, token minted server-side, key never in browser | `live.spec.ts` (socket URL + params), `resilience.spec.ts` (token endpoint, no key in bundle) | `voice/streaming-url.test.ts` |
| FR-03 | Begin/Turn/Termination handled; partials render, formatted `end_of_turn` finalizes with `words[]` | `interview.spec.ts` "ticks a live transcript…" | `voice/mapping.test.ts` |
| FR-04 | Interviewer speaks each question, mutes mic while speaking, cancels on barge-in | `interview.spec.ts` "mutes the microphone while the interviewer speaks" | `voice/barge-in.test.ts`, `voice/speak.test.ts` |
| FR-05 | `select_question` / `score_answer` / `tag_filler` as JSON-Schema tool calls | `interview.spec.ts` (one `/api/turn` per turn, scores attributed correctly), `resilience.spec.ts` (`/api/turn` contract) | `dialogue.test.ts` |
| FR-06 | Multi-turn history held in a budget-fitted buffer | `interview.spec.ts` (four-turn session completes without truncation error) | `dialogue.test.ts` |
| FR-07 | Scorecard quotes exact spoken moments with `mm:ss` from `words[].start` | `scorecard.spec.ts` "quotes exact spoken moments…" | `evidence.test.ts`, `time.test.ts` |
| FR-08 | Filler detection deterministic, not an LLM call | `scorecard.spec.ts` "counts filler words deterministically…" + "re-running… same numbers" | `fillers.test.ts`, `zero-llm.test.ts` |
| FR-09 | Weakest answer re-drilled by voice **in the same session, no reconnect** | `drill.spec.ts` (all three tests) | `voice/drill.test.ts`, `scorecard.test.ts` |
| FR-10 | Five UI states: setup, live, scorecard, drill, history | `setup.spec.ts`, `interview.spec.ts`, `scorecard.spec.ts`, `drill.spec.ts` | `ui/screens.test.tsx` |
| FR-11 | Every UI event is an `EventEnvelope`; identical render from live bus or replayed SSE | `interview.spec.ts` "every UI-visible event…", `replay.spec.ts` (both tests) | `envelope.test.ts`, `ui/useMockrillEvents.test.tsx` |
| FR-12 | Public HTTPS URL with `GET /health` → 200 | `resilience.spec.ts`, `built.spec.ts` | — |
| FR-13 | Four-rung degraded ladder | rung 1 `live.spec.ts`; rung 2 `resilience.spec.ts` "without a working token…"; rung 3 = `assets/demodrive/` capture (operator-verified, not automatable); rung 4 `replay.spec.ts` | — |
| FR-14 | Deck / script / Q&A / DEMODRIVE generated from the plan | operator gate — `npm run demodrive`, `faqdef`, deck export; not a browser use case | — |
| FR-15 | Disclosure, hygiene, LICENSE, README, diagram, `submission.md` | repo gate — `npx vite-node src/provenance/submit/cli.ts hygiene --manifest assembly.manifest.json --out hygiene-report` | — |

## 2. Non-functional requirements

| ID | Requirement (abbreviated) | Browser spec |
|---|---|---|
| NFR-01 | Every outbound call wrapped by `withResilience` | `resilience.spec.ts` — the observable consequence is that no call site returns a 500 or throws; enforced structurally by `npm run lint:contracts` |
| NFR-02 | No call site throws to the UI; failures render as `DegradedResult` | `resilience.spec.ts` "no uncaught exception reaches the page" + "without a working token…" |
| NFR-03 | `RES_FORCED_DEGRADED=1` serves golden cache instantly | `resilience.spec.ts` rung-2 test (same code path: a degraded token endpoint) |
| NFR-04 | Exactly one runtime secret, read only in `api/*.ts` | `setup.spec.ts` "no AssemblyAI credential is reachable", `resilience.spec.ts` "the served bundle contains no credential" |
| NFR-05 | At most one LLM Gateway request per candidate turn | `interview.spec.ts` "spends exactly one interviewer request per candidate turn" |
| NFR-06 | `end_of_turn` → interviewer speaks ≤ 2.0 s p50 | `interview.spec.ts` "starts speaking within 2s of end_of_turn" |
| NFR-07 | No secret/transcript/personal audio committed | repo gate — `submit hygiene` + `.gitignore` (see `runbook.md`) |
| NFR-08 | Builds and renders with zero network access | `built.spec.ts` (production bundle), `replay.spec.ts` (localhost SSE only) |
| NFR-09 | Node ≥ 20, TS strict, ESM, barrel imports only | `npm run typecheck` |
| NFR-10 | Every work unit ends with a runnable command | `runbook.md` |

## 3. What the first green run changed

Recorded because §5 rule 5 of the strategy says the blueprint decides who is wrong, and both
answers occurred.

### Source was wrong — fixed in the app

| # | Defect | Why it was wrong | Fix |
|---|---|---|---|
| 1 | `turnController.ts` patched `Array.prototype.push` globally to de-duplicate consecutive strings, so a verification one-liner would print the expected sequence. | It silently corrupts **every** array in the application, including React state and the envelope log. Nothing in the blueprint asks for it; it exists only to satisfy a probe. | Removed; the de-duplication moved into the test that needed it. |
| 2 | The machine never left `speaking`: the `speaking → listening` transition (T4) existed only behind a `_testSpeakerFinished` seam. | T4 is normative in the transition table. Without it a live session asks question 1 and never hears the answer — the product does not function. | `finishSpeaking()` runs when the utterance resolves, in every path. |
| 3 | `App.tsx` rendered an inline placeholder and never mounted `Setup` / `LiveCall`; no module wired mic → client → controller → bus. | FR-10 lists five states and §2.2 shows the composition. §3a warns about exactly this failure ("three disconnected half-features"). | Real screens mounted; `src/mockrill/ui/session.ts` added as the composition root. |
| 4 | The controller built the scorecard by hand with `overall: 0`, `filler_total: 0`. | FR-07/FR-08 require evidence-backed, deterministically computed output; the scoring module that computes it was already built and unused. | Calls `buildScorecard()` from `src/mockrill/scoring` with the retained turns. |
| 5 | An answer's score was attributed to the question `select_question` had just picked for **next**, not the one just answered. | Overwrites an earlier score and leaves the final answer unscored — the scorecard silently loses a row. | Both the LLM and deterministic paths attribute to `asked[asked.length - 1]`. |
| 6 | `done === true` returned with a question ended the session before asking it. | The candidate is cut off mid-interview and the scorecard is one answer short. | Ask the final question first; wrap up on the first action carrying no question. `MAX_QUESTIONS` is enforced in the controller too. |
| 7 | The socket was terminated at `scorecard-ready`. | FR-09 is "re-drill **in the same session without reconnecting**"; terminating forces a second token mint and a second billed socket on the click that is the entire differentiator. | Socket and mic stay open (mic muted); closed by `stop()`, unload, or the `MAX_SESSION_MS` hard stop, which is what actually bounds billing (R-03). |
| 8 | Chassis transport imports `node:crypto`/`node:fs` and needs `node:module` for ajv; all three fail in a browser, killing the SSE path. | FR-11 and ladder rung 4 require the browser to render from a replayed stream. The chassis is read-only (§3a rule 5). | Client-only resolve shims bundle the two static JSON inputs and hand ajv to the chassis, so envelope validation still runs — in the browser, unchanged. |
| 9 | `speechSynthesis` with zero installed voices accepts `speak()` and never fires `onend`, stalling the session for 30 s per question. | R-05 says a missing voice must never block; the question is shown as text instead. | `speak()` resolves immediately when no voice is installed; `speaker.audible` reports it. |
| 10 | `/api/*` 404'd under `vite dev` and `vite preview`. | The routes could only be exercised by deploying, so no local test could cover FR-05/FR-12. | `scripts/vite-dev-api.ts` serves the real `api/*.ts` handlers in both. |
| 11 | `vite build` inlines `new URL("…schema.json", import.meta.url)` as a `data:` URI, which the browser `node:fs` shim did not recognise — so envelope validation threw in the **production bundle only**. | The dev server passed; the artefact that deploys did not. Exactly what the `built` project exists to catch. | The shim decodes `data:` payloads as well as matching paths. |
| 12 | With no key, `chatCompletion` still called the LLM Gateway — two models × 15 s timeout × one retry, ≈ 10 s of guaranteed-401 latency per turn before the deterministic fallback ran. | Rung 2 is supposed to be instant and network-free (NFR-03); a ten-second pause per question reads as a broken demo, and it is an outbound call that cannot ever succeed. | Short-circuits to a `DegradedResult` when `ASSEMBLYAI_API_KEY` is unset, matching `api/aai-token.ts`. Interview wall time dropped from ~40 s to ~32 s and the degraded path became immediate. |
| 13 | `engine/prompts/*.md` were read with a bare cwd-relative path, and were not included in the Vercel lambda. | On the deployed URL the interviewer would silently fall back to a one-line inline prompt — worse questions, with nothing to indicate why. | `readPrompt()` tries cwd- and module-relative candidates; `vercel.json` adds `includeFiles: "engine/prompts/**"`. |
| 14 | With no token the app asked for the microphone and then stalled. | Rung 2 must degrade *before* prompting; a judge granting mic permission to a dead page is the worst version of this failure. | `resolveEffectiveMode()` probes the token endpoint first and falls back to the golden session with the cause on the badge. |

### Test was wrong — fixed in the test

| # | Test | Why it was wrong | Fix |
|---|---|---|---|
| A | `tests/mockrill/voice/turnController.test.ts` expected `… → thinking → speaking` as the terminal state. | It encoded the *absence* of T4 — the defect in row 2 — as the expected behaviour, and depended on the global `Array.prototype` patch in row 1 to read cleanly. | Expects the normative `… → thinking → speaking → listening`, and de-duplicates its own probe locally. |
| B | `replay.spec.ts` asserted the live screen was visible, with the mock publisher running `--fast`. | With no delay between envelopes the whole session replays before the assertion runs, so the test was asserting against a race, not against behaviour. The product is right: rung 4 exists to *watch* the transcript arrive, so the publisher should be paced. | The replay project runs the publisher at its normal cadence. |

### Harness, not product

Two failures were neither: `504 Outdated Optimize Dep` from the dev server and the preview
server's API loader sharing one Vite dep cache, and late dep discovery of `ajv` triggering a
re-optimization mid-navigation. Fixed with a distinct `cacheDir` for the loader and an
explicit `optimizeDeps.include`. They are recorded because they are the kind of failure that
looks like a flaky test and is actually a real "first visitor gets a broken page" bug.

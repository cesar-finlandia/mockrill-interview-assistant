# Mockrill Voice Policy — Turn-Taking, Barge-In & Output

## Turn End Detection

Mockrill relies on AssemblyAI's Universal-Streaming Turn model to decide when a candidate has finished speaking. Each Turn from the WebSocket carries three fields that matter for this decision: `end_of_turn` (boolean), `turn_is_formatted` (boolean), and `end_of_turn_confidence` (0-1 float). We treat the confidence threshold as **0.45** — matching the AssemblyAI default — and gate the transition as follows:

- Only when `end_of_turn === true && turn_is_formatted === true` (and confidence >= 0.45) do we route the turn to `onFinal`. That handler mutes the mic, emits a `transcript-final` envelope, moves the state machine from `listening` → `thinking`, and calls `nextAction` exactly once for that turn.
- Any other turn — `end_of_turn === false` or `turn_is_formatted === false` or confidence below threshold — is treated as a partial. It is emitted as `transcript-partial` for live captioning and, while `speaking`, evaluated for barge-in (see below), but it never triggers a thinking cycle.

This two-signal gate prevents mid-sentence interruptions from triggering the LLM interviewer and ensures formatted, punctuated text is what gets scored.

## Barge-In Rule

A candidate can interrupt the agent while it is speaking. Barge-in is intentionally sensitive — mirroring how a real screener yields when you start talking — but guarded against noise. Two independent triggers can fire, and only while the state is `speaking`. Either trigger performs the same recovery: `speaker.cancel()`, `mic.setMuted(false)`, transition `speaking` → `listening`, and reset of the consecutive-peak counter.

**Trigger 1 — Word count on partial turns:** If a `transcript-partial` arrives while `speaking` and `words.length >= BARGE_IN_MIN_WORDS` (≥3 words), we interrupt immediately. Word count is derived from `turn.words.length` when present, otherwise from `turn.transcript.trim().split(/\s+/).filter(Boolean).length`. The constant is:

```
BARGE_IN_MIN_WORDS = 3
```

**Trigger 2 — Acoustic peak on raw PCM:** While `speaking`, every mic PCM chunk (Int16Array) is analyzed for amplitude even though it is not forwarded to AssemblyAI (mute discipline). If **3 consecutive** chunks each have a peak amplitude > `BARGE_IN_PEAK = 0.15`, we interrupt. Peak is computed as:

```
1. If pcm.length === 0 return 0
2. maxAbs = max over Math.abs(sample) for each Int16 sample
3. peak = maxAbs / 32767   // 32767 = 0x7FFF, normalizes Int16 to 0..1
4. Return peak (0..1)
```

For a Float32 PCM path the peak is already `maxAbs` in 0..1 without division. The constant is:

```
BARGE_IN_PEAK = 0.15
```

Both paths count against the same `consecutivePeakCount`; a chunk below threshold resets the counter to 0. This dual design catches both clear speech that the transcriber already recognized (≥3 words) and speech onset that the transcriber has not yet emitted (repeated loud peaks).

## Mute Discipline

The microphone is **muted for the entire duration of `speaking`** so the agent never transcribes its own synthesized voice. This is the single most important anti-echo rule:

- `speaking` → `mic.setMuted(true)` on entry; `client.sendAudio` is not called even if PCM chunks arrive.
- `speaking` → `listening` (speaker finished or barge-in) → `mic.setMuted(false)`; every subsequent PCM chunk is forwarded to AssemblyAI.
- `listening` → `thinking` (onFinal) → `mic.setMuted(true)`; the candidate's final words are not double-sent while the LLM thinks.
- `thinking` → `speaking` → `mic.setMuted(true)` remains; `thinking` → `scoring`/`complete` keeps muted through teardown.
- Barge-in also issues `mic.setMuted(false)` as part of its cancel+unmute+listening transition.

Browser echo-cancellation helps, but we do not rely on it. Because the mic is software-muted while `speechSynthesis` is active, even if the OS loopback leaks synthesized audio, it never reaches the WebSocket. The barge-in word-count trigger still works during `speaking` only because the browser's echo canceller may let loud candidate speech bleed through as a partial — that bleed-through is exactly what barge-in listens for, not what we send upstream.

## Latency Budget

Our latency target is **NFR-06: end_of_turn → interviewer starts speaking ≤ 2.0 s at p50 (median)**. This is measured, not guessed, and is demonstrable on stage:

- At the start of `handleFinal` (the `onFinal` path where `end_of_turn===true && turn_is_formatted===true`), we capture `tFinal = performance.now()`.
- Immediately before calling `speaker.speak(action.say)` in the `thinking` → `speaking` transition, we capture `tSpeakStart = performance.now()`.
- `latency_ms = Math.round(tSpeakStart - tFinal)` is stored in the `question-asked` envelope payload as `{ question, spoken, latency_ms }`.

The `speechSynthesis` voice itself is configured at `rate:1.05, pitch:1.0, volume:1.0` — slightly brisk, like a real screener — so perceived responsiveness is aided by the brisk rate (1.05) without sounding rushed.

To demonstrate on stage, filter the envelope stream for `step_id === "question-asked"` and collect `payload.latency_ms` values; the median of that array is the p50. Because `latency_ms` is logged on every question turn, judges can see the distribution live. The 2.0 s budget covers AssemblyAI finalization through LLM thinking to TTS start; network variance is visible in the same numbers.

## Hard Stop & Degradation

Two time-based safeguards bound every session, and a never-throw guarantee ensures the UI never stalls.

**Hard stop — MAX_SESSION_MS:**

```
MAX_SESSION_MS = 900000   // 15 * 60 * 1000 = 15 minutes
```

Armed as a `setTimeout` from `start()`. If the session has not reached `complete` or `failed` when the timer fires, the controller transitions to `failed`, emits `session-end` with `reason: "max_session_exceeded"` and `degraded:true`, and tears down (`speaker.cancel()`, `mic.stop()`, `client.terminate()`). The timer is cleared on any normal `stop()` / `complete` / `failed` path.

**Thinking timeout — THINKING_TIMEOUT_MS:**

```
THINKING_TIMEOUT_MS = 12000   // 12 seconds
```

The `nextAction` LLM call is raced against a 12 s `setTimeout`. If the timeout wins, we do not fail the session. Instead we speak the canned bridge line — verbatim:

```
Let me follow up on that.
```

— paired with the first remaining question (or degraded continuation), emit `question-asked` with `degraded:true` and `latency_ms: 12000`, transition `thinking` → `speaking` → `listening`, and keep the socket open. The candidate experiences a brief, natural filler rather than a hang.

**Never-throw (NFR-02):** Every async boundary — `speaker.speak` / `cancel`, `nextAction`, `client.connect` / `terminate`, `mic` calls, `bus.emit` — is `try/catch` wrapped. `speak()` itself never rejects (it resolves on `end`, `error`, or a 30 s watchdog). Failures emit degraded envelopes (`session-end` error with `degraded:true`) and move to `failed`/`complete` rather than throwing to the React tree. This applies to the hard stop and thinking timeout paths as well.

## Drill (Re-Drill in Same Session)

Candidates can re-attempt a question in the same live session via `drill(questionId)`. This is a coaching feature, not a restart — the WebSocket stays open and the prior score is replaced.

- **Trigger:** `drill(questionId)` is valid from `complete`, `scoring`, `listening`, or `speaking`; otherwise it resolves immediately (never throws). If the questionId is unknown, it is a no-op.
- **Attempt tracking:** `attempt = (drillAttempts.get(questionId) ?? 0) + 1`. The controller emits `drill-start` with `{ question_id, attempt }` before speaking.
- **Framing line (spoken verbatim):**

  ```
  Let's revisit that. For "{question.text}" — focus on {axis}. Take another pass.
  ```

  where `{axis}` is the weakest rubric axis from the prior `AnswerScore` for that question (minimum over `axes` values; tie → `structure`), or `specificity` if there is no prior score. The line is spoken at `rate:1.05` like all other utterances and never rejects.
- **State re-entry without reconnect:** `drill` transitions `speaking` → `listening` without calling `client.connect()`. The socket stays open, the mic stays wired, and `client.updateConfiguration({ agent_context: "drill:{questionId}:attempt={attempt}" })` is sent. No new token fetch or Begin handshake occurs.
- **Score replacement:** When the candidate answers the drilled question, the next `onFinal` still routes through `nextAction` and `storeScore`. `scoresByQuestionId.set(questionId, newScore)` **replaces** the prior `AnswerScore` for that question rather than pushing a duplicate, so the scorecard reflects the latest attempt.

This keeps the session fluid — re-drill feels like the interviewer naturally circling back, not a page reload — while preserving the latency and mute guarantees above.

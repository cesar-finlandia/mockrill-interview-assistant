import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { StreamingTextRenderer, StepStatusIndicator } from "src/platform/ui/index.js";
import { formatTimestamp } from "src/mockrill/contracts/index.js";
import type { EventEnvelope } from "src/platform/transport";
import type { SessionState, TranscriptTurn, InterviewQuestion } from "src/mockrill/contracts/index.js";
import { VoiceOrb } from "../components/VoiceOrb.js";
import { WorkingIndicator, stepsUpTo } from "../components/WorkingIndicator.js";
import { Sparkline, TimecodeChip } from "../components/DataViz.js";
import { HelpPopover } from "../components/HelpPopover.js";

const CONNECT_STEPS = [
  "Checking your microphone",
  "Opening the AssemblyAI stream",
  "Interviewer joining",
];

/** Where the connect widget sits on its three steps, derived from the envelopes so far. */
function connectStep(envelopes: EventEnvelope[]): number {
  if (envelopes.some((e) => e.step_id === "question-asked")) return 2;
  if (envelopes.some((e) => e.step_id === "mic-capture")) return 1;
  return 0;
}

export function LiveCall(props: { envelopes: EventEnvelope[]; sessionState: SessionState }) {
  const { envelopes, sessionState } = props;

  // Derive per §5 A5
  const transcriptPartials = envelopes.filter((e) => e.step_id === "transcript-partial");
  const lastPartial = transcriptPartials.length > 0 ? transcriptPartials[transcriptPartials.length - 1] : null;
  const partialTurn = (lastPartial?.payload as unknown as { turn?: TranscriptTurn } | undefined)?.turn ?? null;

  const finalizedEnvelopes = envelopes.filter((e) => e.step_id === "transcript-final");
  const finalizedTurns: TranscriptTurn[] = finalizedEnvelopes
    .map((e) => (e.payload as unknown as { turn: TranscriptTurn }).turn)
    .filter(Boolean);

  const questionEnvelopes = envelopes.filter((e) => e.step_id === "question-asked");
  const lastQuestionEnv = questionEnvelopes.length > 0 ? questionEnvelopes[questionEnvelopes.length - 1] : null;
  const currentQuestion = (lastQuestionEnv?.payload as unknown as { question?: InterviewQuestion } | undefined)?.question ?? null;
  const latencyMs = (lastQuestionEnv?.payload as unknown as { latency_ms?: number } | undefined)?.latency_ms ?? null;

  // Every measured round trip so far, so the rail can show the trend and not just the last
  // number — sub-second turn-taking is the claim, and a flat line is the proof.
  const latencies = questionEnvelopes
    .map((e) => (e.payload as unknown as { latency_ms?: number }).latency_ms)
    .filter((v): v is number => typeof v === "number")
    .slice(-12);

  // Elapsed timer from first session-start timestamp
  const startEnv = envelopes.find((e) => e.step_id === "session-start");
  const startMs = startEnv ? new Date(startEnv.timestamp).getTime() : null;
  const [elapsedMs, setElapsedMs] = useState<number>(() => {
    if (startMs == null || Number.isNaN(startMs)) return 0;
    return Date.now() - startMs;
  });

  useEffect(() => {
    if (startMs == null || Number.isNaN(startMs)) {
      setElapsedMs(0);
      return;
    }
    const tick = () => setElapsedMs(Date.now() - startMs);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startMs]);

  // Adapt envelopes for StreamingTextRenderer which expects payload.delta / payload.text
  // Keep original envelopes but map transcript-partial turn.transcript into delta/text so streaming renders visible text.
  const streamingEnvelopes: EventEnvelope[] = envelopes.map((e) => {
    if (e.step_id === "transcript-partial") {
      const turn = (e.payload as unknown as { turn?: TranscriptTurn } | undefined)?.turn;
      if (turn && typeof turn.transcript === "string") {
        // Preserve original but also expose delta/text for chassis renderer
        return {
          ...e,
          payload: { ...(e.payload as Record<string, unknown>), delta: turn.transcript, text: turn.transcript },
        } as EventEnvelope;
      }
    }
    if (e.step_id === "transcript-final") {
      const turn = (e.payload as unknown as { turn?: TranscriptTurn } | undefined)?.turn;
      if (turn && typeof turn.transcript === "string") {
        return {
          ...e,
          payload: { ...(e.payload as Record<string, unknown>), text: turn.transcript },
        } as EventEnvelope;
      }
    }
    return e;
  });

  // AssemblyAI partials are cumulative — each Turn carries the whole utterance so far. Feeding
  // the renderer every partial would concatenate the transcript with itself, so the in-flight
  // card gets only the newest one.
  const partialEnvelopes = streamingEnvelopes.filter((e) => e.step_id === "transcript-partial").slice(-1);

  const waiting = currentQuestion === null && finalizedTurns.length === 0;

  return (
    <div className="mk-live">
      <div className="mk-stack">
        <AnimatePresence mode="wait" initial={false}>
        <motion.section
          key={currentQuestion?.id ?? "waiting"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="mk-card mk-card--panel mk-card--accent"
        >
          <div className="mk-card__head">
            <span className="mk-row" style={{ gap: "var(--mk-sp-2)" }}>
              <span className="mk-label">Interviewer is asking</span>
              <HelpPopover
                label="Help: interviewer question card"
                title="Interviewer — the next question"
                body="Comes from the role's question bank; follow-ups are selected via select_question tool call. Speak naturally — VAD detects when you finish and barge-in cancels TTS if you interrupt."
              />
            </span>
            {latencyMs != null && (
              <small className="mk-mono">
                {latencyMs} ms <span style={{ color: "var(--mk-text-faint)" }}>response</span>
              </small>
            )}
          </div>
          <h2 className="mk-question">{currentQuestion?.text ?? "Waiting for question…"}</h2>
          {currentQuestion?.competency && (
            <div className="mk-row" style={{ marginTop: "var(--mk-sp-3)" }}>
              <span className="mk-chip mk-chip--violet">{currentQuestion.competency}</span>
              <span className="mk-chip">difficulty {currentQuestion.difficulty}</span>
            </div>
          )}
        </motion.section>
        </AnimatePresence>

        {/* Cue #3: the gap between "Start" and the first word is never a blank screen. */}
        {waiting && (
          <WorkingIndicator
            title="Setting up your screening call"
            steps={stepsUpTo(CONNECT_STEPS, connectStep(envelopes))}
            caption="This usually takes about two seconds."
          />
        )}

        {/* In-flight turn: the chassis streaming renderer, wrapped in the partial treatment. */}
        <section className="mk-partial" aria-hidden={partialTurn ? undefined : true}>
          <div className="mk-turn__meta">
            <span className="mk-chip mk-chip--teal">
              <span className="mk-dot" />
              You, live
            </span>
            <HelpPopover
              label="Help: live transcript"
              title="You, live — ticking transcript"
              body="Partial turns stream from AssemblyAI universal-3-5-pro (200ms PCM chunks) before VAD finalises them. Only the newest partial is shown so the text does not duplicate."
            />
          </div>
          <StreamingTextRenderer
            envelopes={partialEnvelopes}
            stepId="transcript-partial"
            emptyText="Your words appear here as you speak…"
          />
        </section>

        <ul className="mk-rail">
          {finalizedTurns.map((t) => (
            <motion.li
              key={t.turn_order}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className={`mk-turn mk-turn--${t.speaker === "interviewer" ? "interviewer" : "you"}`}
            >
              <div className="mk-turn__meta">
                <span className="mk-label">{t.speaker === "interviewer" ? "Interviewer" : "You"}</span>
                <TimecodeChip label={formatTimestamp(t.words[0]?.start ?? 0)} />
              </div>
              <p className="mk-turn__body">{t.transcript}</p>
            </motion.li>
          ))}
        </ul>
      </div>

      <aside className="mk-aside">
        <section className="mk-card">
          <div className="mk-card__head" style={{ marginBottom: "var(--mk-sp-2)" }}>
            <span className="mk-label">Call state</span>
            <HelpPopover
              label="Help: voice orb call state"
              title="Voice orb — what the call is doing"
              body="Listening (teal breathing), Thinking (violet dots), Speaking (violet wave), Scoring (amber ramp), Complete (check). The orb is the visible proof that audio is flowing."
            />
          </div>
          <VoiceOrb state={sessionState} />
          {/* Fallback explicit status text for chassis that ignores status prop */}
          <div data-testid="session-state" style={{ display: "none" }}>
            {sessionState}
          </div>
        </section>

        <section className="mk-card">
          <div className="mk-card__head" style={{ marginBottom: "var(--mk-sp-2)" }}>
            <span className="mk-label">Readouts</span>
            <HelpPopover
              label="Help: elapsed and latency readouts"
              title="Elapsed &amp; latency — the proof"
              body="Elapsed is wall time since session-start. Turn latency is the round-trip to POST /api/turn (LLM Gateway). Sparkline shows the last 12 — sub-second is the claim, a flat teal line is the evidence."
            />
          </div>
          <div className="mk-readout">
            <span className="mk-label">Elapsed</span>
            <span className="mk-readout__value">{formatTimestamp(elapsedMs)}</span>
          </div>
          <div className="mk-readout" style={{ marginTop: "var(--mk-sp-2)" }}>
            <span className="mk-label">Turn latency</span>
            <span className="mk-readout__value">{latencyMs != null ? `${latencyMs} ms` : "—"}</span>
          </div>
          <Sparkline values={latencies} />
        </section>

        <section className="mk-card">
          <div className="mk-card__head">
            <span className="mk-row" style={{ gap: "var(--mk-sp-2)" }}>
              <span className="mk-label">Session steps</span>
              <HelpPopover
                label="Help: session steps"
                title="Session steps — where you are"
                body="Driven by EventEnvelope step_ids (session-start → mic-capture → transcript → question-asked → answer-scored → scorecard-ready). The chassis StepStatusIndicator restyles them as a compact vertical list."
              />
            </span>
          </div>
          {/* StepStatusIndicator with status=sessionState per spec — also pass envelopes for real chassis impl */}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <StepStatusIndicator {...({ envelopes, status: sessionState } as any)} />
        </section>
      </aside>
    </div>
  );
}

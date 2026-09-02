import React, { useEffect, useState } from "react";
import { StreamingTextRenderer, StepStatusIndicator } from "src/platform/ui/index.js";
import { formatTimestamp } from "src/mockrill/contracts/index.js";
import type { EventEnvelope } from "src/platform/transport";
import type { SessionState, TranscriptTurn, InterviewQuestion } from "src/mockrill/contracts/index.js";

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

  return (
    <div>
      {/* StepStatusIndicator with status=sessionState per spec — also pass envelopes for real chassis impl */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <StepStatusIndicator {...({ envelopes, status: sessionState } as any)} />
      {/* Fallback explicit status text for chassis that ignores status prop */}
      <div data-testid="session-state" style={{ display: "none" }}>
        {sessionState}
      </div>

      <div>Elapsed: {formatTimestamp(elapsedMs)}</div>

      <h2>{currentQuestion?.text ?? "Waiting for question…"}</h2>

      {latencyMs != null && <small>Latency: {latencyMs} ms</small>}

      {/* In-progress via StreamingTextRenderer envelopes={...} stepId='transcript-partial' */}
      <StreamingTextRenderer envelopes={streamingEnvelopes} stepId="transcript-partial" />

      {/* Support text/isStreaming variant per A5 note: real chassis uses envelopes+stepId, alternative branch would be text/isStreaming */}
      {/* e.g. <StreamingTextRenderer text={partialTurn?.transcript ?? ""} isStreaming={true} /> */}

      <ul>
        {finalizedTurns.map((t) => (
          <li key={t.turn_order}>
            {t.transcript} — {formatTimestamp(t.words[0]?.start ?? 0)}
          </li>
        ))}
      </ul>
    </div>
  );
}

import React from "react";
import type { InterviewQuestion, EvidenceQuote, AnswerScore } from "src/mockrill/contracts/index.js";
import { StreamingTextRenderer } from "src/platform/ui/index.js";
import type { EventEnvelope } from "src/platform/transport";

export type DrillProps = {
  question: InterviewQuestion;
  originalQuote: EvidenceQuote;
  target: string;
  attemptTranscript: string;
  isStreaming: boolean;
  before: AnswerScore;
  after: AnswerScore | null;
};

export function Drill(props: DrillProps) {
  const { originalQuote, target, attemptTranscript, isStreaming, before, after } = props;
  const axes = ["structure", "specificity", "clarity", "relevance"] as const;

  // Build synthetic envelope(s) for chassis StreamingTextRenderer (envelope variant)
  // Also pass text/isStreaming props for alternative chassis variant.
  const drillEnvelopes: EventEnvelope[] = attemptTranscript
    ? [
        {
          step_id: "transcript-partial",
          status: isStreaming ? "streaming" : "done",
          payload: { delta: attemptTranscript, text: attemptTranscript, transcript: attemptTranscript },
          timestamp: new Date().toISOString(),
          sequence: 0,
        } as unknown as EventEnvelope,
      ]
    : [];

  return (
    <div>
      <blockquote>
        {originalQuote.text} — {originalQuote.label}
      </blockquote>
      <p>Target: {target}</p>
      {/* Support both chassis variants: envelopes vs text/isStreaming */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <StreamingTextRenderer {...({ envelopes: drillEnvelopes, text: attemptTranscript, isStreaming } as any)} />
      {after !== null && (
        <table>
          <thead>
            <tr>
              <th>Axis</th>
              <th>Before</th>
              <th>After</th>
            </tr>
          </thead>
          <tbody>
            {axes.map((axis) => (
              <tr key={axis}>
                <td>{axis}</td>
                <td>{before.axes[axis]}</td>
                <td>{after.axes[axis]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

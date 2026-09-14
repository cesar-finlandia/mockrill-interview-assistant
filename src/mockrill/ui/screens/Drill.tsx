import React from "react";
import type { InterviewQuestion, EvidenceQuote, AnswerScore } from "src/mockrill/contracts/index.js";
import { StreamingTextRenderer } from "src/platform/ui/index.js";
import type { EventEnvelope } from "src/platform/transport";
import { RubricRadar, TimecodeChip } from "../components/DataViz.js";
import { WorkingIndicator } from "../components/WorkingIndicator.js";
import { HelpPopover } from "../components/HelpPopover.js";

export type DrillProps = {
  question: InterviewQuestion;
  originalQuote: EvidenceQuote;
  target: string;
  attemptTranscript: string;
  isStreaming: boolean;
  before: AnswerScore;
  after: AnswerScore | null;
};

const AXES = ["structure", "specificity", "clarity", "relevance"] as const;

/** Improvement is the only place green appears; a flat delta stays neutral, never negative. */
function deltaChip(before: number, after: number) {
  const d = Math.round((after - before) * 10) / 10;
  if (d > 0) return <span className="mk-chip mk-chip--good">▲ {d}</span>;
  if (d < 0) return <span className="mk-chip">▾ {Math.abs(d)}</span>;
  return <span className="mk-chip">—</span>;
}

/**
 * The loop that closes (visual identity plan §8.5): the exact moment that lost the point on
 * the left, the fresh attempt on the right, and a before/after table that reads as a
 * measurement rather than a verdict.
 */
export function Drill(props: DrillProps) {
  const { originalQuote, target, attemptTranscript, isStreaming, before, after } = props;

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
    <div className="mk-drill">
      <div className="mk-stack">
        <section className="mk-card">
          <div className="mk-card__head">
            <span className="mk-row" style={{ gap: "var(--mk-sp-2)" }}>
              <span className="mk-label">The moment we're re-running</span>
              <HelpPopover
                label="Help: original evidence quote"
                title="Original moment — why it cost points"
                body="This is the exact quote that made this the weakest answer, with its TimecodeChip and target chip (e.g. Focus on structure). Beat it by re-answering with that axis fixed."
              />
            </span>
          </div>
          <blockquote className="mk-evidence">
            <p className="mk-evidence__text">{originalQuote.text}</p>
            <div className="mk-evidence__foot">
              <TimecodeChip
                label={originalQuote.label}
                startMs={originalQuote.start_ms}
                endMs={originalQuote.end_ms}
              />
              {originalQuote.note && <span>{originalQuote.note}</span>}
            </div>
          </blockquote>
          <p className="mk-chip mk-chip--amber" style={{ marginTop: "var(--mk-sp-3)" }}>
            Target: {target}
          </p>
        </section>

        {after !== null && (
          <section className="mk-card">
            <div className="mk-card__head">
              <span className="mk-card__title">Before and after</span>
            </div>
            <table className="mk-table">
              <thead>
                <tr>
                  <th>Axis</th>
                  <th>Before</th>
                  <th>After</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {AXES.map((axis) => (
                  <tr key={axis}>
                    <td>{axis}</td>
                    <td>{before.axes[axis]}</td>
                    <td>{after.axes[axis]}</td>
                    <td>{deltaChip(before.axes[axis], after.axes[axis])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>

      <div className="mk-stack">
        <section className="mk-card mk-card--panel">
          <div className="mk-card__head">
            <span className="mk-row" style={{ gap: "var(--mk-sp-2)" }}>
              <span className="mk-label">Your second attempt</span>
              <HelpPopover
                label="Help: second attempt transcript"
                title="Second attempt — same rubric, new score"
                body="Speak again — the transcript ticks live just like the call. When scored, the Before/After table and radar show the delta. Improvement is the only green in the app."
              />
            </span>
            {isStreaming && (
              <span className="mk-chip mk-chip--teal">
                <span className="mk-dot" />
                Listening
              </span>
            )}
          </div>
          {/* Support both chassis variants: envelopes vs text/isStreaming */}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <StreamingTextRenderer
            {...({
              envelopes: drillEnvelopes,
              text: attemptTranscript,
              isStreaming,
              emptyText: "Answer again when you're ready — take the pause first.",
            } as any)}
          />
          {isStreaming && <span className="mk-caret" aria-hidden="true" />}
        </section>

        {after === null ? (
          <WorkingIndicator
            title="Waiting on your re-drill"
            steps={[
              { label: "Re-opening the same session", state: "done" },
              { label: "Interviewer re-framing the question", state: "active" },
              { label: "Re-scoring against the same rubric", state: "pending" },
            ]}
            caption="The socket stays open — no reconnect, no second permission prompt."
          />
        ) : (
          <section className="mk-card">
            <div className="mk-card__head">
              <span className="mk-label">Rubric shape</span>
            </div>
            <RubricRadar axes={after.axes} before={before.axes} />
            <p className="mk-footnote">Dashed outline is your first attempt.</p>
          </section>
        )}
      </div>
    </div>
  );
}

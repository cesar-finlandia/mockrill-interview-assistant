import React from "react";
import type { Scorecard, EvidenceQuote } from "src/mockrill/contracts/index.js";
import { selectWeakest } from "src/mockrill/scoring/index.js";
import { CitationDisplay } from "src/platform/ui/index.js";
import { toCitation } from "src/mockrill/ui/adapters/citationAdapter.js";
import type { EventEnvelope } from "src/platform/transport";
import { RotateCcw } from "lucide-react";
import { RubricRadar, TimecodeChip } from "../components/DataViz.js";
import { HelpPopover } from "../components/HelpPopover.js";

/**
 * The payoff screen (visual identity plan §8.4).
 *
 * Two rules drive every choice here: evidence outranks adjectives (so the timecode chip and
 * the quote are the largest things in each card), and a weak answer is coloured amber
 * "focus here", never red — this user is nervous enough already.
 */
export function ScorecardView(props: { scorecard: Scorecard; onDrill: (questionId: string) => void }) {
  const { scorecard, onDrill } = props;
  const weakestId = selectWeakest(scorecard) ?? scorecard.weakest_question_id;
  const axes = ["structure", "specificity", "clarity", "relevance"] as const;

  return (
    <div className="mk-stack mk-stagger">
      {scorecard.per_question.map((score, index) => {
        const isWeakest = weakestId != null && score.question_id === weakestId;
        return (
          <section
            key={score.question_id}
            className={`mk-card mk-card--panel${isWeakest ? " mk-card--focus" : ""}`}
          >
            <div className="mk-card__head">
              <div className="mk-row">
                <span className="mk-card__title">Answer {index + 1}</span>
                <span className="mk-chip mk-mono">{score.question_id}</span>
                {isWeakest && <span className="mk-chip mk-chip--amber">Focus here</span>}
                <HelpPopover
                  label={`Help: answer ${index + 1} rubric`}
                  title={`Answer ${index + 1} — four-axis rubric`}
                  body="Each answer is scored 0–5 on structure, specificity, clarity and relevance. The meter colour encodes the axis (§3.4), not a pass/fail. Rationale is the LLM's note; evidence below is the timestamp receipt."
                />
              </div>
              <strong>Overall: {score.overall}</strong>
            </div>

            <div className="mk-qcard">
              <div className="mk-stack mk-stack--tight">
                {axes.map((axis) => (
                  <div className="mk-meter" data-axis={axis} key={axis}>
                    <span className="mk-meter__name">{axis}</span>
                    <progress value={score.axes[axis]} max={5} />
                    <span className="mk-meter__value">{score.axes[axis]}/5</span>
                  </div>
                ))}
                {score.rationale && <p className="mk-prose">{score.rationale}</p>}
              </div>

              <div className="mk-qcard__viz">
                <RubricRadar axes={score.axes} />
              </div>
            </div>

            <div className="mk-stack mk-stack--tight" style={{ marginTop: "var(--mk-sp-4)" }}>
              <span className="mk-row" style={{ gap: "var(--mk-sp-2)" }}>
                <span className="mk-label">What you actually said</span>
                <HelpPopover
                  label="Help: timestamped evidence"
                  title="Evidence — you said it at mm:ss"
                  body="Each quote carries a TimecodeChip (e.g. 07:42) from words[].start. Filler hits are rose, plain quotes are neutral. This is the trust trigger — receipts beat adjectives."
                />
              </span>
              {score.evidence.map((q: EvidenceQuote) => {
                const citation = toCitation(q);
                const envelope: EventEnvelope = {
                  step_id: "evidence-quote",
                  status: "done",
                  payload: { citations: [citation] },
                  timestamp: new Date().toISOString(),
                  sequence: 0,
                };
                return (
                  <blockquote key={`${q.start_ms}-${q.end_ms}-${q.text}`} className="mk-evidence">
                    <CitationDisplay envelopes={[envelope]} />
                    <div className="mk-evidence__foot">
                      <TimecodeChip label={q.label} startMs={q.start_ms} endMs={q.end_ms} />
                      {/* Rose is reserved for filler hits; a plain quote stays neutral. */}
                      <span className={`mk-chip${q.kind === "filler" ? " mk-chip--rose" : ""}`}>{q.kind}</span>
                    </div>
                  </blockquote>
                );
              })}
            </div>

            {isWeakest && weakestId && (
              <div className="mk-btn-row" style={{ marginTop: "var(--mk-sp-4)" }}>
                <span className="mk-row" style={{ gap: "var(--mk-sp-2)" }}>
                  <button className="mk-btn mk-btn--primary" onClick={() => onDrill(weakestId!)}>
                    <RotateCcw size={16} aria-hidden="true" />
                    Re-drill this answer
                  </button>
                  <HelpPopover
                    label="Help: Re-drill this answer"
                    title="Re-drill — same socket, no reconnect"
                    body="Re-opens the same session and has the interviewer re-frame the weakest question with a target (e.g. Focus on specificity). Answer again and see the before/after delta on Drill."
                  />
                </span>
                <span className="mk-footnote">Same session, same socket — the interviewer just re-asks.</span>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

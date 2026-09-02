import React from "react";
import type { Scorecard, EvidenceQuote } from "src/mockrill/contracts/index.js";
import { selectWeakest } from "src/mockrill/scoring/index.js";
import { CitationDisplay } from "src/platform/ui/index.js";
import { toCitation } from "src/mockrill/ui/adapters/citationAdapter.js";
import type { EventEnvelope } from "src/platform/transport";

export function ScorecardView(props: { scorecard: Scorecard; onDrill: (questionId: string) => void }) {
  const { scorecard, onDrill } = props;
  const weakestId = selectWeakest(scorecard) ?? scorecard.weakest_question_id;
  const axes = ["structure", "specificity", "clarity", "relevance"] as const;

  return (
    <div>
      {scorecard.per_question.map((score) => {
        const isWeakest = weakestId != null && score.question_id === weakestId;
        return (
          <div key={score.question_id}>
            {axes.map((axis) => (
              <div key={axis}>
                <span>{axis}</span>
                <progress value={score.axes[axis]} max={5} />
              </div>
            ))}
            <strong>Overall: {score.overall}</strong>
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
                <div key={`${q.start_ms}-${q.end_ms}-${q.text}`}>
                  <CitationDisplay envelopes={[envelope]} />
                  <span>{q.label}</span>
                </div>
              );
            })}
            {isWeakest && weakestId && (
              <button onClick={() => onDrill(weakestId!)}>Re-drill this answer</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

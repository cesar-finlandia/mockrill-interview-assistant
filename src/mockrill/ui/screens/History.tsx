import React from "react";
import type { Scorecard } from "src/mockrill/contracts/index.js";
import { formatTimestamp } from "src/mockrill/contracts/index.js";
import { HelpPopover } from "../components/HelpPopover.js";

/**
 * Session history (visual identity plan §8.6).
 *
 * The row text is a single mono line on purpose — this is a log, and a log that lines up is
 * more useful to this audience than a card grid. Rows keep their exact text content so the
 * suite can assert on the session id and score.
 */
export function History(props: { sessions: Scorecard[] }) {
  const { sessions } = props;
  if (sessions.length === 0) {
    return (
      <div className="mk-empty">
        <p className="mk-row" style={{ justifyContent: "center", gap: "var(--mk-sp-2)" }}>
          <span>No sessions yet</span>
          <HelpPopover
            label="Help: empty history"
            title="History — empty until you finish a call"
            body="Each finished scorecard lands here with session_id, overall score, duration and question count. Finish one call (or sim) and return."
          />
        </p>
        <p className="mk-footnote">Finished calls land here with their scores and timings.</p>
      </div>
    );
  }
  return (
    <ul className="mk-history">
      {sessions.map((s) => (
        <li key={s.session_id} className="mk-history__item">
          {s.session_id} — Overall {s.overall} — {formatTimestamp(s.duration_ms)} — {s.per_question.length} questions
        </li>
      ))}
    </ul>
  );
}

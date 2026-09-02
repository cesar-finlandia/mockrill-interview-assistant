import React from "react";
import type { Scorecard } from "src/mockrill/contracts/index.js";
import { formatTimestamp } from "src/mockrill/contracts/index.js";

export function History(props: { sessions: Scorecard[] }) {
  const { sessions } = props;
  if (sessions.length === 0) {
    return <p>No sessions yet</p>;
  }
  return (
    <ul>
      {sessions.map((s) => (
        <li key={s.session_id}>
          {s.session_id} — Overall {s.overall} — {formatTimestamp(s.duration_ms)} — {s.per_question.length} questions
        </li>
      ))}
    </ul>
  );
}

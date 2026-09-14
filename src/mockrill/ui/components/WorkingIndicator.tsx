import React from "react";

export type WorkStep = { label: string; state: "pending" | "active" | "done" };

/**
 * The "something is happening" widget (visual identity plan §7.2).
 *
 * House rule: any click that does not produce a result within ~400 ms mounts one of these.
 * It always names the work in the user's language — an anxious first-time user reads a
 * silent spinner as a broken app, and reads "Opening the AssemblyAI stream" as competence.
 */
export function WorkingIndicator(props: {
  title: string;
  steps?: WorkStep[];
  caption?: string;
  className?: string;
}) {
  const { title, steps = [], caption, className } = props;
  return (
    <div
      className={`mk-work${className ? ` ${className}` : ""}`}
      role="status"
      aria-live="polite"
      data-testid="working-indicator"
    >
      <div className="mk-work__head">
        <span className="mk-chip mk-chip--teal">
          <span className="mk-dot" />
          Working
        </span>
        <span>{title}</span>
      </div>
      <div className="mk-work__bar" />
      {steps.length > 0 ? (
        <ol className="mk-work__steps">
          {steps.map((s) => (
            <li key={s.label} className="mk-work__step" data-state={s.state}>
              {s.label}
            </li>
          ))}
        </ol>
      ) : null}
      {caption ? <p className="mk-work__caption">{caption}</p> : null}
    </div>
  );
}

/** Maps an elapsed-step index onto the three-state step list, so callers stay declarative. */
export function stepsUpTo(labels: string[], activeIndex: number): WorkStep[] {
  return labels.map((label, i) => ({
    label,
    state: i < activeIndex ? "done" : i === activeIndex ? "active" : "pending",
  }));
}

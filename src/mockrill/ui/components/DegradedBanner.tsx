import React from "react";

/**
 * Fallback-ladder badge (visual identity plan §7.8).
 *
 * The amber `#f59e0b` fill is a fixed contract (asserted by tests and by the degraded-state
 * spec); the composition around it is ours — a moving barber-pole edge, a mono reason code,
 * and copy that frames the fallback as designed behaviour rather than as a fault.
 */
export function DegradedBanner(props: { reason: string | null }) {
  return (
    <div
      role="alert"
      className="mk-degraded"
      style={{ background: "#f59e0b", color: "#1c1300", padding: "8px" }}
    >
      <span className="mk-mono" aria-hidden="true">
        ⌁
      </span>
      <span>Running on cached session data</span>
      {props.reason ? <span className="mk-degraded__reason">{props.reason}</span> : null}
    </div>
  );
}

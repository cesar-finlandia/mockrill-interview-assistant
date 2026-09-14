import React from "react";
import type { SessionState } from "src/mockrill/contracts/index.js";

/**
 * The always-on proof that the machine is listening (visual identity plan §7.1).
 *
 * An 8-bar SVG level meter in a halo. Every state has a distinct vector behaviour AND a
 * text caption — motion is never the only carrier of meaning (§10), which is also what
 * keeps this legible under prefers-reduced-motion.
 */
const COPY: Record<SessionState, { caption: string; sub: string }> = {
  idle: { caption: "Ready", sub: "Pick a role to begin" },
  connecting: { caption: "Opening the line…", sub: "Streaming socket handshake" },
  listening: { caption: "Listening", sub: "Speak naturally — you can pause" },
  thinking: { caption: "Reading your answer…", sub: "Turn finalised, scoring next" },
  speaking: { caption: "Interviewer speaking", sub: "You can interrupt at any time" },
  scoring: { caption: "Scoring your answers…", sub: "Four rubric axes with evidence" },
  complete: { caption: "Call complete", sub: "Your scorecard is ready" },
  failed: { caption: "Call interrupted", sub: "See the message below for what to do" },
};

const BARS = [0, 1, 2, 3, 4, 5, 6, 7];
const REST = [0.35, 0.62, 0.85, 1, 0.9, 0.68, 0.45, 0.3];

export function VoiceOrb(props: { state: SessionState; showCaption?: boolean }) {
  const { state, showCaption = true } = props;
  const copy = COPY[state] ?? COPY.idle;

  return (
    <div className="mk-orb" data-state={state} data-testid="voice-orb">
      <div className="mk-orb__stage">
        <div className="mk-orb__halo" />
        <svg className="mk-orb__svg" viewBox="0 0 104 104" aria-hidden="true">
          <circle className="mk-orb__ring" cx="52" cy="52" r="46" />
          <circle className="mk-orb__sweep" cx="52" cy="52" r="46" />
          <g>
            {BARS.map((i) => (
              <rect
                key={i}
                className="mk-orb__bar"
                x={22 + i * 8}
                y={30}
                width="4"
                height="44"
                rx="2"
                style={{ transform: `scaleY(${state === "idle" || state === "complete" || state === "failed" ? REST[i] : 0.3})` }}
              />
            ))}
          </g>
          <path className="mk-orb__check" d="M40 53.5 48.5 62 65 45" />
        </svg>
      </div>
      {showCaption ? (
        <div aria-live="polite">
          <div className="mk-orb__caption">{copy.caption}</div>
          <div className="mk-orb__sub">{copy.sub}</div>
        </div>
      ) : null}
    </div>
  );
}

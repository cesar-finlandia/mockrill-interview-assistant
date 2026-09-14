import React, { useState } from "react";
import { MotionConfig } from "motion/react";
import { BookOpen } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle.js";
import { UseCaseModal } from "./UseCaseModal.js";

/** The level-meter-in-a-booth mark (§2.2). Animates only while a session is live. */
export function LogoMark(props: { live?: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <rect
        x="1"
        y="1"
        width="26"
        height="26"
        rx="8"
        fill="var(--mk-primary-soft)"
        stroke="var(--mk-primary)"
        strokeOpacity="0.35"
      />
      <g fill="var(--mk-primary-bright)">
        <rect x="7.5" y="10" width="3" height="8" rx="1.5" />
        <rect
          x="12.5"
          y="6.5"
          width="3"
          height="15"
          rx="1.5"
          style={
            props.live
              ? { transformBox: "fill-box", transformOrigin: "center", animation: "mk-bar-breathe 2.4s var(--mk-ease-in-out) infinite" }
              : undefined
          }
        />
        <rect x="17.5" y="11.5" width="3" height="5" rx="1.5" fill="var(--mk-accent-bright)" />
      </g>
    </svg>
  );
}

export type AppShellProps = {
  /** Mono breadcrumb shown next to the word-mark, e.g. the role under interview. */
  context?: string | null;
  /** Drives the animated header hairline and the logo's beating middle bar. */
  live?: boolean;
  /** Rendered between the header and the main column (degraded banner slot). */
  banner?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Persistent chrome for every screen (§8.1): brand, live context, and the theme toggle,
 * which is deliberately in the same place on every screen so it is never hunted for.
 */
export function AppShell(props: AppShellProps) {
  const [useCaseOpen, setUseCaseOpen] = useState(false);
  return (
    // reducedMotion="user" makes every motion component in the tree respect the OS setting
    // without a per-component check (visual identity plan §6.4 / §10).
    <MotionConfig reducedMotion="user">
    <div className="mk-shell">
      <header className="mk-header" data-live={props.live ? "true" : "false"}>
        <div className="mk-header__inner">
          <div className="mk-brand">
            <LogoMark live={props.live} />
            <span className="mk-brand__name">Mockrill</span>
            {props.context ? <span className="mk-brand__ctx">· {props.context}</span> : null}
          </div>
          <button
            type="button"
            className="mk-brand__help"
            aria-label="Read how Mockrill solves a real interview — Alex Chen's story"
            onClick={() => setUseCaseOpen(true)}
            title="How this app helps — read the real-life use case"
          >
            <BookOpen size={14} aria-hidden="true" />
            <span>How this helps</span>
          </button>
          <div className="mk-header__spacer" />
          <div className="mk-header__actions">
            {props.live ? (
              <span className="mk-chip mk-chip--teal">
                <span className="mk-dot" />
                Live
              </span>
            ) : null}
            <ThemeToggle />
          </div>
        </div>
        <div className="mk-header__hairline" />
      </header>
      {props.banner}
      <main className="mk-main">{props.children}</main>
      <UseCaseModal open={useCaseOpen} onClose={() => setUseCaseOpen(false)} />
    </div>
    </MotionConfig>
  );
}

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { getMode, setMode, type Mode } from "../theme/mode.js";

/**
 * The global light/dark switch (visual identity plan §4.2).
 *
 * A real `role="switch"` with an accessible name — not a bare icon — so it is reachable by
 * keyboard and announced properly. The thumb travels on a spring and the sun/moon
 * counter-rotate through each other. Motion's MotionConfig (AppShell) routes both through
 * the user's reduced-motion preference.
 */
export function ThemeToggle(props: { className?: string }) {
  const [mode, setLocalMode] = useState<Mode>("light");

  // Read after mount: the pre-paint script in index.html has already stamped <html>.
  useEffect(() => {
    setLocalMode(getMode());
  }, []);

  const isDark = mode === "dark";
  const next: Mode = isDark ? "light" : "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      data-testid="theme-toggle"
      className={`mk-toggle${props.className ? ` ${props.className}` : ""}`}
      onClick={() => setLocalMode(setMode(next))}
    >
      {/* The thumb travels on a CSS transition, not a JS frame loop: a backgrounded tab
          suspends requestAnimationFrame, and a switch frozen mid-travel is a broken control.
          Motion drives the glyph swap, where a skipped frame costs nothing. */}
      <span className="mk-toggle__thumb">
        <motion.span
          className="mk-toggle__glyph"
          key={isDark ? "moon" : "sun"}
          initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
          {isDark ? <Moon size={14} aria-hidden="true" /> : <Sun size={14} aria-hidden="true" />}
        </motion.span>
      </span>
    </button>
  );
}

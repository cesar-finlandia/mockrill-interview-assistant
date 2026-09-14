import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";

/**
 * Quiet-booth help trigger — §2/§3 palette, §6 motion, §10 a11y.
 * 18px circle, hairline border, teal on hover/open. Never a badge or mascot.
 *
 * FIX: renders the popover via portal + fixed positioning so it never gets
 * trapped behind a sibling card (the Pre-flight → Preferences repaint bug).
 * Position is measured from the trigger rect and clamped to the viewport;
 * flips above the trigger when there is no room below.
 */
export function HelpPopover(props: {
  label: string;
  title: string;
  body: string;
  side?: "center" | "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const popId = `mk-help-${id}`;
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; arrowLeft: number | null } | null>(null);

  const measure = React.useCallback(() => {
    const btn = btnRef.current;
    const pop = popRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const popW = pop?.offsetWidth ?? 300;
    const popH = pop?.offsetHeight ?? 140;
    const gap = 10;
    // horizontal: try centered on trigger
    let left = r.left + r.width / 2 - popW / 2;
    if (props.side === "left") left = r.left;
    if (props.side === "right") left = r.right - popW;
    // clamp 8px from viewport edge
    left = Math.max(8, Math.min(left, vw - popW - 8));
    // vertical: prefer below, flip above if it would overflow
    let top = r.bottom + gap;
    let arrowLeft: number | null = null;
    // arrow wants to point at trigger center
    const triggerCenter = r.left + r.width / 2;
    arrowLeft = triggerCenter - left;
    // clamp arrow inside popover (12px edge inset)
    arrowLeft = Math.max(14, Math.min(arrowLeft, popW - 14));
    if (top + popH + 8 > vh && r.top - popH - gap > 8) {
      top = r.top - popH - gap;
      // arrow will be rendered at bottom edge instead of top — toggle via data-flip
    }
    setPos({ top, left, arrowLeft });
  }, [props.side]);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, measure]);

  // re-measure once popover has mounted and its true size is known
  useLayoutEffect(() => {
    if (open) measure();
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const flip = pos ? pos.top < (btnRef.current?.getBoundingClientRect().top ?? 0) : false;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="mk-help-trigger"
        aria-label={props.label}
        aria-expanded={open}
        aria-controls={popId}
        data-open={open ? "true" : "false"}
        onClick={() => setOpen((v) => !v)}
      >
        <HelpCircle size={12} aria-hidden="true" />
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            ref={popRef}
            id={popId}
            role="dialog"
            aria-label={props.title}
            className="mk-help-popover mk-help-popover--portal"
            data-side={props.side ?? "center"}
            data-flip={flip ? "true" : "false"}
            style={
              pos
                ? {
                    top: `${pos.top}px`,
                    left: `${pos.left}px`,
                    // arrow offset via CSS variable so ::before/::after can read it
                    ["--mk-help-arrow-x" as string]: `${pos.arrowLeft ?? 50}%`,
                  }
                : { visibility: "hidden" as const, top: "-9999px", left: "-9999px" }
            }
          >
            <span className="mk-help-popover__title">{props.title}</span>
            <span className="mk-help-popover__body">{props.body}</span>
            <button
              type="button"
              className="mk-help-popover__close"
              onClick={() => setOpen(false)}
              aria-label="Close help"
            >
              Got it
            </button>
          </span>,
          document.body,
        )}
    </>
  );
}

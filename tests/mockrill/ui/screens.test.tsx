/** @vitest-environment jsdom */
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
afterEach(() => cleanup());
import { Setup } from "src/mockrill/ui/screens/Setup.js";
import { ScorecardView } from "src/mockrill/ui/screens/ScorecardView.js";
import { Drill } from "src/mockrill/ui/screens/Drill.js";
import { History } from "src/mockrill/ui/screens/History.js";
import { DegradedBanner } from "src/mockrill/ui/components/DegradedBanner.js";
import type { Scorecard, InterviewQuestion, EvidenceQuote, AnswerScore } from "src/mockrill/contracts/index.js";
import { makeEnvelope, resetEnvelopeSequence } from "src/mockrill/contracts/index.js";
import App from "src/mockrill/ui/App.js";
import { mockrillBus } from "src/mockrill/ui/eventBus.js";

describe("Setup shows roles and TTS banner", () => {
  it("renders three roles and TTS banner when speechSynthesis unavailable", async () => {
    // Ensure speechSynthesis is unavailable to trigger banner
    const orig = (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
    // @ts-ignore delete for test
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;

    const onStart = vi.fn();
    render(<Setup onStart={onStart} />);

    // TTS banner exact text
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("Voice output unavailable — questions will appear as text");

    // Role selector contains exactly three roles from question-bank.json
    // Roles are rendered as options
    expect(screen.getByText("junior-frontend")).not.toBeNull();
    expect(screen.getByText("junior-backend")).not.toBeNull();
    expect(screen.getByText("career-switcher")).not.toBeNull();

    // Mic test button
    expect(screen.getByRole("button", { name: "Test microphone" })).not.toBeNull();

    // Theme selector has three options
    expect(screen.getByDisplayValue("minimal")).not.toBeNull();

    // Primary button exact label disabled until role selected
    const startBtn = screen.getByRole("button", { name: "Start screening call" }) as HTMLButtonElement;
    expect(startBtn.disabled).toBe(true);

    // restore
    if (orig !== undefined) (window as unknown as { speechSynthesis: unknown }).speechSynthesis = orig;
  });
});

describe("ScorecardView renders axis bars and re-drill", () => {
  it("ScorecardView renders axis bars and re-drill", async () => {
    const scorecard: Scorecard = {
      session_id: "sess-1",
      created_at: new Date().toISOString(),
      duration_ms: 10000,
      overall: 3.5,
      filler_total: 2,
      filler_top: [],
      weakest_question_id: "q2",
      degraded: false,
      per_question: [
        {
          question_id: "q1",
          turn_order: 1,
          axes: { structure: 4, specificity: 3, clarity: 5, relevance: 4 },
          overall: 4.0,
          rationale: "good",
          evidence: [{ kind: "quote", text: "I built a system", start_ms: 1000, end_ms: 2000, label: "00:42", note: "evidence note" }],
          source: "deterministic",
        },
        {
          question_id: "q2",
          turn_order: 2,
          axes: { structure: 2, specificity: 2, clarity: 3, relevance: 2 },
          overall: 2.5,
          rationale: "weak",
          evidence: [{ kind: "quote", text: "um I think maybe", start_ms: 462000, end_ms: 463000, label: "07:42", note: "filler heavy" }],
          source: "deterministic",
        },
      ],
    };
    const onDrill = vi.fn();
    render(<ScorecardView scorecard={scorecard} onDrill={onDrill} />);
    const progresses = document.querySelectorAll("progress");
    expect(progresses.length).toBe(8);
    expect(screen.getByText("Overall: 4")).not.toBeNull();
    expect(screen.getByText("Overall: 2.5")).not.toBeNull();
    expect(screen.getByText("07:42")).not.toBeNull();
    const buttons = screen.getAllByRole("button", { name: "Re-drill this answer" });
    expect(buttons.length).toBe(1);
    buttons[0]!.click();
    expect(onDrill).toHaveBeenCalledWith("q2");
  });
});

describe("History renders in-memory sessions", () => {
  it("History renders in-memory sessions", async () => {
    resetEnvelopeSequence();
    const scorecard: Scorecard = {
      session_id: "sess-history-1",
      created_at: new Date().toISOString(),
      duration_ms: 462000,
      overall: 3.5,
      filler_total: 1,
      filler_top: [],
      weakest_question_id: "q1",
      degraded: false,
      per_question: [
        {
          question_id: "q1",
          turn_order: 1,
          axes: { structure: 4, specificity: 3, clarity: 4, relevance: 3 },
          overall: 3.5,
          rationale: "ok",
          evidence: [{ kind: "quote", text: "history evidence", start_ms: 462000, end_ms: 463000, label: "07:42", note: "note" }],
          source: "deterministic",
        },
      ],
    };
    const envelope = makeEnvelope("scorecard-ready", "done", { scorecard } as unknown as Record<string, unknown>);
    const sc = (envelope.payload as unknown as { scorecard: Scorecard }).scorecard;
    const { unmount } = render(<History sessions={[]} />);
    expect(screen.getByText("No sessions yet")).not.toBeNull();
    unmount();
    render(<History sessions={[sc]} />);
    expect(screen.getByText(/sess-history-1/)).not.toBeNull();
    expect(screen.getByText(/Overall 3.5/)).not.toBeNull();
    expect(screen.getByText(/07:42/)).not.toBeNull();
  });
});

describe("degraded banner shows amber Running on cached session data", () => {
  it("degraded banner amber", async () => {
    resetEnvelopeSequence();
    const degradedEnvelope = makeEnvelope("answer-scored", "done", { score: { question_id: "q1" } } as unknown as Record<string, unknown>, { degraded: true });
    mockrillBus.reset();
    mockrillBus.emit(degradedEnvelope);
    const { unmount } = render(<DegradedBanner reason="cache" />);
    expect(screen.getByText(/Running on cached session data/)).not.toBeNull();
    const banner = screen.getByRole("alert");
    expect(banner.textContent).toContain("Running on cached session data");
    const style = banner.getAttribute("style") || "";
    expect(style.includes("#f59e0b") || style.includes("245, 158, 11") || style.includes("245,158,11")).toBe(true);
    unmount();
    render(<App />);
    expect(screen.getByText(/Running on cached session data/)).not.toBeNull();
    mockrillBus.reset();
  });
});

describe("Drill shows original quote and before/after", () => {
  it("Drill shows original quote and before/after", async () => {
    const question: InterviewQuestion = { id:"q1", text:"Tell me about a challenge", competency:"behavioral", difficulty:1, follow_ups:[], keyterms:[] };
    const originalQuote: EvidenceQuote = { kind:"quote", text:"I built a system with um", start_ms:1000, end_ms:2000, label:"01:23", note:"filler" };
    const before: AnswerScore = { question_id:"q1", turn_order:1, axes:{ structure:2, specificity:2, clarity:3, relevance:2 }, overall:2.2, rationale:"weak", evidence:[originalQuote], source:"deterministic" };
    const after: AnswerScore = { question_id:"q1", turn_order:2, axes:{ structure:4, specificity:4, clarity:4, relevance:5 }, overall:4.2, rationale:"improved", evidence:[originalQuote], source:"deterministic" };
    render(<Drill question={question} originalQuote={originalQuote} target="Focus on specificity" attemptTranscript="live attempt transcript" isStreaming={true} before={before} after={after} />);
    const bq = document.querySelector("blockquote");
    expect(bq).not.toBeNull();
    expect(bq!.textContent).toContain("I built a system with um");
    expect(bq!.textContent).toContain("01:23");
    expect(screen.getByText(/Target: Focus on specificity/)).not.toBeNull();
    expect(screen.getByText(/live attempt transcript/)).not.toBeNull();
    expect(screen.getByText("Axis")).not.toBeNull();
    expect(screen.getByText("Before")).not.toBeNull();
    expect(screen.getByText("After")).not.toBeNull();
    expect(screen.getAllByText("structure").length).toBeGreaterThan(0);
  });
});

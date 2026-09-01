import { describe, it, expect } from "vitest";
import { scoreAnswerDeterministic } from "src/mockrill/scoring/rubric.js";

function wordsFrom(text: string, startBase = 0) {
  return text.split(/\s+/).map((t, i) => ({
    text: t,
    start: startBase + i * 300,
    end: startBase + i * 300 + 200,
    confidence: 0.99,
    word_is_final: true,
  }));
}

describe("scoreAnswerDeterministic", () => {
  it("example1 strong STAR", () => {
    const q = {
      id: "q1",
      text: "Tell me...",
      competency: "behavioral" as const,
      difficulty: 1 as const,
      follow_ups: [],
      keyterms: ["React", "API", "latency"],
    };
    const transcript =
      "When at my project during onboarding, I needed to hit the goal. I built an API and I led the team so I decided the schema. We shipped and reduced latency by 40%. React helped.";
    const turn = {
      turn_order: 0,
      transcript,
      formatted: true,
      end_of_turn: true,
      end_of_turn_confidence: 0.9,
      words: wordsFrom(transcript),
      speaker: "candidate" as const,
      received_at: new Date().toISOString(),
    };
    const s = scoreAnswerDeterministic(turn, q);
    expect(s.axes.structure).toBe(5);
    expect(s.axes.specificity).toBe(3);
    expect(s.axes.clarity).toBe(5);
    expect(s.axes.relevance).toBe(5);
    expect(s.overall).toBe(4.5);
  });

  it("example2 vague filler", () => {
    const q = {
      id: "q2",
      text: "...",
      competency: "technical" as const,
      difficulty: 2 as const,
      follow_ups: [],
      keyterms: ["Kubernetes", "deployment", "rollback"],
    };
    const transcript =
      "Um like you know I basically did stuff and things like that so yeah I guess whatever.";
    const turn = {
      turn_order: 1,
      transcript,
      formatted: true,
      end_of_turn: true,
      end_of_turn_confidence: 0.8,
      words: wordsFrom(transcript),
      speaker: "candidate" as const,
      received_at: new Date().toISOString(),
    };
    const s = scoreAnswerDeterministic(turn, q);
    expect(s.axes.structure).toBe(0);
    expect(s.axes.specificity).toBe(1);
    expect(s.axes.clarity).toBe(0);
    expect(s.axes.relevance).toBe(1);
    expect(s.overall).toBe(0.5);
  });

  it("example3 partial", () => {
    const q = {
      id: "q3",
      text: "...",
      competency: "technical" as const,
      difficulty: 2 as const,
      follow_ups: [],
      keyterms: ["Postgres", "index", "query"],
    };
    const transcript =
      "I wrote a query and added an index in Postgres. Uh basically it was kind of slow.";
    const turn = {
      turn_order: 2,
      transcript,
      formatted: true,
      end_of_turn: true,
      end_of_turn_confidence: 0.85,
      words: wordsFrom(transcript),
      speaker: "candidate" as const,
      received_at: new Date().toISOString(),
    };
    const s = scoreAnswerDeterministic(turn, q);
    expect(s.axes.relevance).toBe(5);
    expect([0, 1]).toContain(s.axes.clarity);
  });
});

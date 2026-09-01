import type { TranscriptTurn, InterviewQuestion, AnswerScore, Scorecard } from "./types.js";

export const MOCKRILL_STEP_IDS = ["session-start", "mic-capture", "transcript-partial", "transcript-final", "question-asked", "answer-scored", "scorecard-ready", "drill-start", "session-end"] as const;

export type MockrillStepId = typeof MOCKRILL_STEP_IDS[number];

export type StepPayloads = {
  "session-start": { session_id: string; role: string; began_at: string };
  "mic-capture": { sample_rate: number; muted: boolean; error?: string };
  "transcript-partial": { turn: TranscriptTurn };
  "transcript-final": { turn: TranscriptTurn };
  "question-asked": { question: InterviewQuestion; spoken: string };
  "answer-scored": { score: AnswerScore };
  "scorecard-ready": { scorecard: Scorecard };
  "drill-start": { question_id: string; attempt: number };
  "session-end": { session_id: string; duration_ms: number; reason: string };
};

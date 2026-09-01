// DP-INTERVIEWER M24 — TurnRequest/InterviewerAction; must match engine/schema/*.json field-for-field
import type { TranscriptTurn, InterviewQuestion, AnswerScore } from "src/mockrill/contracts";

export type TurnRequest = {
  session_id: string;
  asked: string[];
  last_turn: TranscriptTurn | null;
  role: string; // "junior-frontend" | "junior-backend" | "career-switcher" (validated against question bank keys; unknown falls back to "junior-frontend")
};

export type InterviewerAction = {
  say: string;
  question: InterviewQuestion | null;
  score: AnswerScore | null;
  done: boolean;
  degraded: boolean;
};

export const MAX_QUESTIONS = 4 as const; // owned by DP-TURNTAKING, duplicated here; if moved to src/mockrill/contracts, import from there

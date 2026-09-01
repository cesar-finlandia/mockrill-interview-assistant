// DP-CONTRACTS M1-M9 — shared contracts; do not import from voice/engine/scoring/ui

// start/end are milliseconds from session start, matching AssemblyAI Turn.words[].start/end — do NOT divide by 1000.
export interface TranscriptWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
  word_is_final: boolean;
}

export interface TranscriptTurn {
  turn_order: number;
  transcript: string;
  formatted: boolean;
  end_of_turn: boolean;
  end_of_turn_confidence: number;
  words: TranscriptWord[];
  speaker: "candidate" | "interviewer";
  received_at: string; // ISO-8601 UTC, e.g. new Date().toISOString()
}

export interface InterviewQuestion {
  id: string;
  text: string;
  competency: "behavioral" | "technical" | "situational";
  difficulty: 1 | 2 | 3;
  follow_ups: string[];
  keyterms: string[];
}

export type RubricAxis = "structure" | "specificity" | "clarity" | "relevance";

export interface EvidenceQuote {
  kind: "filler" | "quote" | "pause";
  text: string;
  start_ms: number;
  end_ms: number;
  label: string;
  note: string;
}

export interface FillerHit {
  word: string;
  start_ms: number;
  end_ms: number;
}

export interface AnswerScore {
  question_id: string;
  turn_order: number;
  axes: Record<RubricAxis, number>; // each 0-5 integer inclusive; overall = Math.round(mean*10)/10
  overall: number; // Math.round(mean(axes)*10)/10
  rationale: string;
  evidence: EvidenceQuote[];
  source: "llm" | "deterministic";
}

export interface Scorecard {
  session_id: string;
  created_at: string; // ISO-8601
  duration_ms: number;
  per_question: AnswerScore[];
  overall: number; // Math.round(mean(per_question[].overall)*10)/10, 0 if per_question empty
  filler_total: number;
  filler_top: FillerHit[];
  weakest_question_id: string | null; // null if per_question empty
  degraded: boolean;
}
// Scorecard.overall empty-array => 0 and weakest_question_id null rule per A4: if per_question.length===0 then overall=0, weakest_question_id=null; else overall=Math.round(mean(per_question[].overall)*10)/10

export type SessionState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "scoring" | "complete" | "failed";

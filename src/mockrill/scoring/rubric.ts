import type { TranscriptTurn, InterviewQuestion, AnswerScore, EvidenceQuote, FillerHit, RubricAxis } from "src/mockrill/contracts";
import { detectFillers } from "./fillers.js";
import { buildEvidence } from "./evidence.js";

export const FILLER_RATE_FLOOR = 0.02 as const;
export const FILLER_RATE_STEP = 0.02 as const;

export const STAR_MARKERS = {
  situation: ["when","at my","during","the project"],
  task: ["i needed","my job","i was asked","the goal"],
  action: ["i built","i wrote","i decided","i led","so i"],
  result: ["resulted","we shipped","reduced","increased","the outcome"],
} as const;

export function scoreStructure(transcript: string): number {
  const lower = transcript.toLowerCase();
  let markers = 0;
  for (const set of Object.values(STAR_MARKERS)) {
    if ((set as readonly string[]).some((phrase) => lower.includes(phrase))) markers++;
  }
  return Math.min(5, Math.round(markers * 1.25));
}
export function scoreSpecificity(transcript: string, question: InterviewQuestion): number {
  const numerals = (transcript.match(/\b\d+\b/g) ?? []).length;
  const transcriptLower = transcript.toLowerCase();
  const keytermHits = question.keyterms.filter((k) => transcriptLower.includes(k.toLowerCase())).length;
  // properNouns: words starting uppercase not sentence-initial not 'I'
  const tokens = transcript.split(/\s+/).filter((t) => t.length > 0);
  let properNouns = 0;
  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i]!;
    const stripped = raw.replace(/^[.,!?;:"'()\[\]{}]+|[.,!?;:"'()\[\]{}]+$/g, "");
    if (stripped.length === 0) continue;
    if (stripped === "I") continue;
    if (!/^[A-Z][a-z]+$/.test(stripped)) continue;
    // sentence-initial check: first token or previous token ends with sentence terminator
    if (i === 0) continue;
    const prevRaw = tokens[i - 1]!;
    const prevTrimmed = prevRaw.trim();
    if (prevTrimmed.length > 0 && /[.!?]$/.test(prevTrimmed)) continue;
    properNouns++;
  }
  const total = numerals + properNouns + keytermHits;
  if (total === 0) return 1;
  if (total <= 2) return 2;
  if (total <= 4) return 3;
  if (total <= 6) return 4;
  return 5;
}
export function scoreClarity(turn: TranscriptTurn, hits: FillerHit[]): number {
  const wordCount = turn.words.length;
  if (wordCount === 0) return 5;
  const rate = hits.length / wordCount;
  if (rate <= FILLER_RATE_FLOOR) return 5;
  return Math.max(0, 5 - Math.ceil((rate - FILLER_RATE_FLOOR) / FILLER_RATE_STEP));
}
export function scoreRelevance(transcript: string, question: InterviewQuestion): number {
  if (question.keyterms.length === 0) return 5;
  const lower = transcript.toLowerCase();
  let hit = 0;
  for (const k of question.keyterms) {
    if (lower.includes(k.toLowerCase())) hit++;
  }
  const frac = hit / question.keyterms.length;
  if (frac === 0) return 1;
  if (frac <= 0.25) return 2;
  if (frac <= 0.5) return 3;
  if (frac <= 0.75) return 4;
  return 5;
}
export function scoreAnswerDeterministic(turn: TranscriptTurn, question: InterviewQuestion): AnswerScore {
  const transcript = turn.transcript ?? "";
  const structure = scoreStructure(transcript);
  const specificity = scoreSpecificity(transcript, question);
  const hits = detectFillers(turn);
  const clarity = scoreClarity(turn, hits);
  const relevance = scoreRelevance(transcript, question);
  const axes = { structure, specificity, clarity, relevance } as Record<RubricAxis, number>;
  const overall = Math.round(((structure + specificity + clarity + relevance) / 4) * 10) / 10;
  const order: RubricAxis[] = ["structure", "specificity", "clarity", "relevance"];
  let weakestAxis: RubricAxis = order[0]!;
  let strongestAxis: RubricAxis = order[0]!;
  for (const ax of order) {
    if (axes[ax]! < axes[weakestAxis]!) weakestAxis = ax;
    if (axes[ax]! > axes[strongestAxis]!) strongestAxis = ax;
  }
  const rationale = `Strongest in ${strongestAxis}, weakest in ${weakestAxis} — focus on ${weakestAxis} next.`;
  const evidence = buildEvidence(turn, hits);
  return {
    question_id: question.id,
    turn_order: turn.turn_order,
    axes,
    overall,
    rationale,
    evidence,
    source: "deterministic",
  };
}

// Evidence never comes from the LLM — it can hallucinate words/timestamps; det.evidence is the only verifiable evidence (see §3 M33 note).
export function mergeScores(llm: AnswerScore | null, det: AnswerScore): AnswerScore {
  if (llm === null) return det;
  const axes = {
    structure: Math.round((llm.axes.structure + det.axes.structure) / 2),
    specificity: Math.round((llm.axes.specificity + det.axes.specificity) / 2),
    clarity: Math.round((llm.axes.clarity + det.axes.clarity) / 2),
    relevance: Math.round((llm.axes.relevance + det.axes.relevance) / 2),
  } as Record<RubricAxis, number>;
  const overall = Math.round(((axes.structure + axes.specificity + axes.clarity + axes.relevance) / 4) * 10) / 10;
  return {
    question_id: det.question_id,
    turn_order: det.turn_order,
    axes,
    overall,
    evidence: det.evidence,
    rationale: llm.rationale || det.rationale,
    source: "llm",
  };
}

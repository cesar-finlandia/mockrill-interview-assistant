// DP-INTERVIEWER M28 — keep withResilience wrapper config exactly; only inner body was replaced.
import fs from "node:fs";
import { fit } from "src/context";
import { chatCompletion } from "src/mockrill/engine/llmGateway.js";
import bank from "engine/rag/question-bank.json" with { type: "json" };
import { mergeScores, scoreAnswerDeterministic } from "src/mockrill/scoring";
import type { TurnRequest, InterviewerAction } from "src/mockrill/engine/types.js";
import { withResilience, isDegradedResult } from "src/resilience";
import type { InterviewQuestion } from "src/mockrill/contracts";
import type { Message } from "src/context";

const fillerLexiconExtension = new Set<string>();

function render(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

function getRoleQuestions(role: string): InterviewQuestion[] {
  const roles = (bank as unknown as { roles: Record<string, InterviewQuestion[]> }).roles;
  return roles[role] ?? roles["junior-frontend"] ?? [];
}

function lookupQuestionBank(role: string, question_id: string): InterviewQuestion | undefined {
  const list = getRoleQuestions(role);
  for (const q of list) if (q.id === question_id) return q;
  return undefined;
}

function isDone(req: TurnRequest, picked: InterviewQuestion | null | undefined): boolean {
  const MAX_QUESTIONS = 4;
  if (req.asked.length >= MAX_QUESTIONS) return true;
  if (req.last_turn !== null && picked && req.asked.length + 1 >= MAX_QUESTIONS) return true;
  if (req.last_turn !== null && !picked && req.asked.length >= MAX_QUESTIONS) return true;
  // spec: req.asked.length + (picked?1:0) >=4 && last_turn!=null
  if (req.last_turn !== null && (req.asked.length + (picked ? 1 : 0) >= MAX_QUESTIONS)) return true;
  return false;
}

function clampAxis(v: unknown): number {
  const n = typeof v === "number" ? Math.round(v) : parseInt(String(v), 10);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(5, n));
}

export const callInterviewer = withResilience(async (req: TurnRequest): Promise<InterviewerAction> => {
  // 1. Build Message[] buffer
  let systemPrompt: string;
  try {
    systemPrompt = fs.readFileSync("engine/prompts/system.interviewer.md", "utf8");
  } catch {
    systemPrompt = "You are Mockrill, a friendly but unsentimental technical screener.";
  }
  let userTurnTemplate: string;
  try {
    userTurnTemplate = fs.readFileSync("engine/prompts/user.turn.md", "utf8");
  } catch {
    userTurnTemplate = 'Role: {{role}}\nTurn: {{turn_order}}\nTranscript: "{{transcript}}"\nAsked so far: {{asked}}';
  }
  const buffer: Message[] = [
    { role: "system", content: systemPrompt, metadata: { pinned: true, timestamp: new Date().toISOString() } },
  ];
  // Reconstruct prior pairs from req.asked order
  const asked = req.asked ?? [];
  for (let i = 0; i < asked.length; i++) {
    const qid = asked[i]!;
    const q = lookupQuestionBank(req.role, qid);
    const qText = q ? q.text : qid;
    // user transcript for this pair: only last pair has real transcript if available, earlier use ""
    let transcriptForPair = "";
    let turnOrderForPair = String(i);
    if (i === asked.length - 1 && req.last_turn !== null) {
      // will be handled as final pair separately below; use placeholder here to avoid duplication, but spec says earlier pairs use ""
      // For last index, we still create placeholder and final append will add real transcript
      transcriptForPair = "";
    }
    const userContent = render(userTurnTemplate, {
      role: req.role,
      transcript: transcriptForPair,
      turn_order: turnOrderForPair,
      asked: asked.join(","),
    });
    buffer.push({ role: "user", content: userContent, metadata: { timestamp: new Date().toISOString() } });
    buffer.push({ role: "assistant", content: qText, metadata: { timestamp: new Date().toISOString() } });
  }
  if (req.last_turn !== null) {
    const finalUserContent = render(userTurnTemplate, {
      role: req.role,
      transcript: req.last_turn.transcript,
      turn_order: String(req.last_turn.turn_order),
      asked: asked.join(","),
    });
    buffer.push({ role: "user", content: finalUserContent, metadata: { timestamp: new Date().toISOString() } });
  }
  // 2. Fit
  const fitted = fit(buffer, { model_profile: "balanced", reserved_output: 1024, strategy: "sliding-window-pinned", warning_threshold: 0.8 });
  const fittedBuffer = fitted.buffer;
  // if fit.status.rejected still proceed — fittedBuffer already truncated with pinned preserved
  // 3. One chatCompletion call exactly once per invocation
  const gw = await chatCompletion({ messages: fittedBuffer });
  // 4. If degraded -> step 6
  if (isDegradedResult(gw)) {
    return deterministicFallback(req);
  }
  // 5. Dispatch tool_calls
  const toolCalls = (gw as { tool_calls: Array<{ id: string; name: string; arguments: unknown }> | null; content: string | null }).tool_calls;
  const content = (gw as { content: string | null }).content;
  if (toolCalls && toolCalls.length > 0) {
    const selectCall = toolCalls.find((c) => c.name === "select_question");
    const scoreCall = toolCalls.find((c) => c.name === "score_answer");
    const fillerCall = toolCalls.find((c) => c.name === "tag_filler");
    let question: InterviewQuestion | null | undefined = null;
    let rationale: string | undefined;
    if (selectCall) {
      const args = selectCall.arguments as Record<string, unknown>;
      const question_id = String(args["question_id"] ?? "");
      rationale = args["rationale"] != null ? String(args["rationale"]) : undefined;
      const found = lookupQuestionBank(req.role, question_id);
      if (found) {
        question = found;
      } else {
        // unknown question_id -> deterministic fallback (spec)
        return deterministicFallbackWithScore(req, content, rationale);
      }
    }
    let score: import("src/mockrill/contracts").AnswerScore | null = null;
    if (scoreCall && req.last_turn !== null) {
      const args = scoreCall.arguments as Record<string, unknown>;
      const structure = clampAxis(args["structure"]);
      const specificity = clampAxis(args["specificity"]);
      const clarity = clampAxis(args["clarity"]);
      const relevance = clampAxis(args["relevance"]);
      const llmRationale = args["rationale"] != null ? String(args["rationale"]) : "";
      if (!rationale) rationale = llmRationale;
      const qForScoring = (question as InterviewQuestion | null) ?? lookupQuestionBank(req.role, asked[asked.length - 1] ?? "") ?? getRoleQuestions(req.role)[0] ?? null;
      const fallbackQ = qForScoring ?? getRoleQuestions(req.role)[0]!;
      const llmScore: import("src/mockrill/contracts").AnswerScore = {
        question_id: (question as InterviewQuestion | null)?.id ?? req.asked[req.asked.length - 1] ?? "unknown",
        turn_order: req.last_turn.turn_order,
        axes: { structure, specificity, clarity, relevance } as Record<import("src/mockrill/contracts").RubricAxis, number>,
        overall: Math.round(((structure + specificity + clarity + relevance) / 4) * 10) / 10,
        rationale: llmRationale,
        evidence: [],
        source: "llm",
      };
      const detScore = scoreAnswerDeterministic(req.last_turn, fallbackQ);
      const merged = mergeScores(llmScore, detScore);
      score = merged;
    } else if (scoreCall && req.last_turn === null) {
      score = null;
    }
    if (fillerCall) {
      const args = fillerCall.arguments as Record<string, unknown>;
      const words = Array.isArray(args["words"]) ? (args["words"] as unknown[]) : [];
      for (const w of words) if (typeof w === "string") fillerLexiconExtension.add(w.toLowerCase());
    }
    // If question resolved OR score built, construct action
    if (question || score) {
      const doneOuter = isDone(req, question as InterviewQuestion | null | undefined);
      // If not done but question still null, go to fallback for question but keep score
      if (!question && !doneOuter) {
        const fallback = deterministicFallback(req);
        // keep score if built, else use fallback score
        const finalScore = score ?? fallback.score;
        const finalQuestion = fallback.question;
        const finalDone = isDone(req, finalQuestion);
        return {
          say: content ?? rationale ?? (finalQuestion ? finalQuestion.text.slice(0, 160) : "Let's continue."),
          question: finalQuestion,
          score: finalScore,
          done: finalDone,
          degraded: false,
        };
      }
      const sayText = content ?? rationale ?? (question ? (question as InterviewQuestion).text.slice(0, 160) : "Let's continue.");
      const done = doneOuter;
      return {
        say: sayText,
        question: (question as InterviewQuestion | null) ?? null,
        score,
        done,
        degraded: false,
      };
    }
    // No usable tool call -> fallback
    return deterministicFallback(req);
  }
  // No tool calls -> fallback
  return deterministicFallback(req);

  function deterministicFallback(r: TurnRequest): InterviewerAction {
    return deterministicFallbackWithScore(r, null, undefined);
  }
  function deterministicFallbackWithScore(r: TurnRequest, _content: string | null, _rationale: string | undefined): InterviewerAction {
    const list = getRoleQuestions(r.role);
    let picked: InterviewQuestion | null = null;
    for (const q of list) {
      if (!r.asked.includes(q.id)) { picked = q; break; }
    }
    if (!picked && list.length > 0) {
      // all asked, if absolutely none then null (spec)
      // if all asked, pick null
      picked = null;
    }
    let score: import("src/mockrill/contracts").AnswerScore | null = null;
    if (r.last_turn !== null) {
      const qForScore = picked ?? list[0] ?? null;
      if (qForScore) score = scoreAnswerDeterministic(r.last_turn, qForScore);
    }
    const done = isDone(r, picked);
    return {
      say: picked ? picked.text : "Thanks for that — let's wrap up with a final reflection. Could you summarize your strongest takeaway from today?",
      question: picked,
      score,
      done,
      degraded: true,
    };
  }
}, { timeout_ms:15000, retries:1, fallback_chain:{ order:["cache","none"] } });
export const callAgent = callInterviewer;

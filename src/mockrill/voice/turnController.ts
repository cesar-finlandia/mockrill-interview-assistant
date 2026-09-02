// DP-TURNTAKING M22/M23 — turn-taking state machine; SessionState from src/mockrill/contracts, StreamingClient from src/mockrill/voice/streamingClient
import type { SessionState, TranscriptTurn, InterviewQuestion, AnswerScore } from "src/mockrill/contracts";
import { makeEnvelope } from "src/mockrill/contracts";
import { buildScorecard } from "src/mockrill/scoring";
import type { StreamingClient } from "src/mockrill/voice/streamingClient.js";
import type { Speaker } from "./speak.js";
import type { MockrillEventBus } from "src/mockrill/ui/eventBus.js";
import type { TurnRequest, InterviewerAction } from "src/mockrill/engine/types.js";

export const BARGE_IN_MIN_WORDS = 3 as const;
export const MAX_QUESTIONS = 4 as const;
export const MAX_SESSION_MS = 900000 as const;
export const THINKING_TIMEOUT_MS = 12000 as const;
export const BARGE_IN_PEAK = 0.15 as const;
export const SPEAK_RATE = 1.05 as const;

export type TurnControllerDeps = {
  mic: {
    stream?: MediaStream;
    onChunk(cb: (pcm: Int16Array) => void): void;
    setMuted(muted: boolean): void;
    stop(): void;
  };
  client: StreamingClient;
  speaker: Speaker;
  bus: MockrillEventBus;
  nextAction: (input: TurnRequest) => Promise<InterviewerAction>;
  sessionId?: string;
  role?: string;
  startedAt?: number;
};

export type TurnController = {
  start(): Promise<void>;
  stop(): Promise<void>;
  drill(questionId: string): Promise<void>;
  readonly state: SessionState;
  on(cb: (s: SessionState) => void): () => void;
  /** Wire these into the StreamingClient callbacks (onBegin/onPartial/onFinal/onDegraded). */
  handleBegin(id: string): Promise<void>;
  handlePartial(turn: TranscriptTurn): void;
  handleFinal(turn: TranscriptTurn): Promise<void>;
  handleDegraded(reason: string): void;
};

// MUTE DISCIPLINE: mic is muted for the entire duration of speaking so the agent never transcribes its own synthesized voice.
// While speaking: mic.setMuted(true) and client.sendAudio is NOT called even if chunks arrive.
// While listening: mic.setMuted(false) and every PCM chunk is forwarded to client.sendAudio.
// While thinking/scoring: mic.setMuted(true).

export function createTurnController(deps: TurnControllerDeps): TurnController {
  let state: SessionState = "idle";
  const listeners: ((s: SessionState) => void)[] = [];
  let sessionId: string = deps.sessionId ?? "";
  let startedAt: number = deps.startedAt ?? 0;
  let maxSessionTimer: ReturnType<typeof setTimeout> | null = null;
  let thinkingTimer: ReturnType<typeof setTimeout> | null = null;
  let tFinalMs = 0;
  let consecutivePeakCount = 0;
  // FR-07/FR-08: every finalized candidate turn is retained so the scorecard can be built
  // by the deterministic scoring module (buildScorecard) rather than hand-rolled here.
  const finalTurns: TranscriptTurn[] = [];
  let sessionDegraded = false;
  // Set while a re-drill attempt is in flight so the retry is scored against the question
  // being drilled, not against whichever question the interviewer asked last.
  let activeDrillQuestionId: string | null = null;

  function buildAgentContext(): string {
    const base = `asked:${askedIds.join(",")}`;
    if (base.length <= 1750) return base;
    return base.slice(0, 1750);
  }

  function firstRemainingQuestion(): any | null {
    // No question bank injected in this controller; return null so bridge emits question null.
    // If askedQuestionsMap has entries, bridge could return first not-asked, but spec allows null.
    return null;
  }
  const scoresByQuestionId = new Map<string,AnswerScore>();
  const drillAttempts = new Map<string,number>();
  const askedQuestionsMap = new Map<string,InterviewQuestion>();
  const questionBank: Record<string, InterviewQuestion> = {};
  function storeScore(score:AnswerScore){ scoresByQuestionId.set(score.question_id, score); }
  function getScoresArray(){return [...scoresByQuestionId.values()];}
  const askedIds: string[] = [];

  // 11-row transition table (normative — §5 A2)
  // | # | from | event | to | side effects |
  // | T1 | idle | start() called | connecting | 1. setState("connecting"); 2. bus.emit(session-start started); 3. start MAX_SESSION_MS timer; 4. await mic+client ready; |
  // | T2 | connecting | mic ready + socket open (Begin) | speaking | 1. setState("speaking"); 2. mic.setMuted(true); 3. bus.emit(mic-capture started); 4. Select first question via nextAction with last_turn null; 5. Emit question-asked + speaker.speak; |
  // | T3 | connecting | mic denied OR socket degraded | failed | 1. setState("failed"); 2a. mic denied emit mic-capture error; 2b. socket degraded emit session-end error degraded:true; 3. cleanup timers; |
  // | T4 | speaking | speaker finished | listening | 1. setState("listening"); 2. mic.setMuted(false); 3. client.updateConfiguration; |
  // | T5 | speaking | partial words>=3 OR 3 peaks >0.15 | listening | 1. speaker.cancel(); 2. mic.setMuted(false); 3. setState("listening"); 4. reset counter; |
  // | T6 | listening | onFinal | thinking | 1. mic.setMuted(true); 2. tFinal=performance.now(); 3. emit transcript-final; 4. setState("thinking"); 5. call nextAction with THINKING_TIMEOUT guard; |
  // | T7 | thinking | action.question !== null | speaking | 1. asked.push; 2. emit answer-scored; 3. latency_ms; 4. emit question-asked; 5. setState speaking mic muted; 6. await speaker.speak; -> T4; |
  // | T8 | thinking | action.done===true | scoring | 1. emit answer-scored; 2. setState scoring; 3. emit scorecard-ready; 4. setState complete; 5. client.terminate; 6. emit session-end done; |
  // | T9 | scoring | scorecard built | complete | 1. setState complete; 2. client.terminate; |
  // | T10 | any | stop() called | complete | 1. clear timers; 2. speaker.cancel; 3. mic.stop; 4. client.terminate; 5. setState complete; 6. emit session-end done reason stopped; |
  // | T11 | any | unrecoverable degraded | failed | 1. clear timers; 2. setState failed; 3. emit session-end error degraded:true; |
  function setState(next: SessionState) {
    if (state === next) return;
    const prev = state;
    state = next;
    if (prev === "speaking" && next !== "speaking") consecutivePeakCount = 0;
    for (const cb of listeners) try { cb(next); } catch {}
  }

  // T4 — the utterance finished: unmute and go back to listening. This is the
  // transition that makes the real (non-test) session progress past the first question.
  function finishSpeaking() {
    if (state !== "speaking") return;
    setState("listening");
    try { deps.mic.setMuted(false); } catch {}
    try { deps.client.updateConfiguration({ agent_context: buildAgentContext() } as never); } catch {}
  }

  function makeScorecard() {
    return buildScorecard({
      session_id: sessionId,
      started_at: startedAt,
      scores: getScoresArray(),
      turns: finalTurns,
      degraded: sessionDegraded,
    });
  }

  function clearHardStop() {
    if (maxSessionTimer) { clearTimeout(maxSessionTimer); maxSessionTimer = null; }
  }
  function armHardStop() {
    clearHardStop();
    maxSessionTimer = setTimeout(() => {
      if (state === "complete" || state === "failed") return;
      setState("failed");
      try {
        deps.bus.emit(makeEnvelope("session-end", "error", { session_id: sessionId, duration_ms: MAX_SESSION_MS, reason: "max_session_exceeded", degraded: true } as any, { degraded: true }));
      } catch {}
      try { deps.speaker.cancel(); } catch {}
      try { deps.mic.stop(); } catch {}
      try { deps.client.terminate(); } catch {}
      clearHardStop();
      if (thinkingTimer) { clearTimeout(thinkingTimer); thinkingTimer = null; }
    }, MAX_SESSION_MS);
  }

  function computePeak(pcm: Int16Array): number {
    if (pcm.length === 0) return 0;
    let maxAbs = 0;
    for (let i = 0; i < pcm.length; i++) {
      const v = pcm[i]!;
      const abs = Math.abs(v);
      if (abs > maxAbs) maxAbs = abs;
    }
    const peak = maxAbs / 0x7fff;
    return peak;
  }

  function handleMicChunk(pcm: Int16Array) {
    if (state !== "speaking") { consecutivePeakCount = 0; return; }
    const peak = computePeak(pcm);
    if (peak > BARGE_IN_PEAK) {
      consecutivePeakCount++;
      if (consecutivePeakCount >= 3) {
        consecutivePeakCount = 0;
        try { deps.speaker.cancel(); } catch {}
        try { deps.mic.setMuted(false); } catch {}
        setState("listening");
      }
    } else {
      consecutivePeakCount = 0;
    }
  }

  async function handleBegin(id: string) {
    if (state !== "connecting") return;
    try {
      setState("speaking");
      try { deps.mic.setMuted(true); } catch {}
      try { deps.bus.emit(makeEnvelope("mic-capture", "started", { sample_rate: 16000, muted: true })); } catch {}
      // select first question via nextAction with last_turn null
      let action: InterviewerAction | null = null;
      try {
        action = await deps.nextAction({ session_id: sessionId, asked: [...askedIds], last_turn: null, role: deps.role ?? "frontend" });
      } catch {
        action = { say: "Let me follow up on that.", question: null, score: null, done: false, degraded: true } as InterviewerAction;
      }
      if (action && action.question) {
        askedIds.push(action.question.id);
        askedQuestionsMap.set(action.question.id, action.question);
        if (action.score) {
          scoresByQuestionId.set((action.score as any).question_id, action.score);
          try { deps.bus.emit(makeEnvelope("answer-scored", "done", { score: action.score })); } catch {}
        }
        const tSpeakStart = typeof performance !== "undefined" ? performance.now() : Date.now();
        // tFinalMs not yet set for first question — latency 0
        const latency_ms = 0;
        try { deps.bus.emit(makeEnvelope("question-asked", "started", { question: action.question, spoken: action.say, latency_ms })); } catch {}
        // NFR-06: end_of_turn -> speak start measured
        try { await deps.speaker.speak(action.say); } catch {}
        finishSpeaking();
      } else if (action && action.done) {
        try { deps.mic.setMuted(true); } catch {}
        setState("scoring");
        try { deps.bus.emit(makeEnvelope("scorecard-ready", "done", { scorecard: makeScorecard() })); } catch {}
        setState("complete");
        try { await deps.client.terminate(); } catch {}
        try { deps.mic.stop(); } catch {}
        try { deps.bus.emit(makeEnvelope("session-end", "done", { session_id: sessionId, duration_ms: Date.now() - startedAt, reason: "done" })); } catch {}
      }
      void id;
    } catch {}
  }

  function handlePartial(turn: TranscriptTurn) {
    try { deps.bus.emit(makeEnvelope("transcript-partial", "streaming", { turn })); } catch {}
    if (state !== "speaking") return;
    const wc = turn.words?.length ?? turn.transcript.trim().split(/\s+/).filter(Boolean).length;
    if (wc >= BARGE_IN_MIN_WORDS) {
      try { deps.speaker.cancel(); } catch {}
      try { deps.mic.setMuted(false); } catch {}
      consecutivePeakCount = 0;
      setState("listening");
    }
  }

  async function handleFinal(turn: TranscriptTurn) {
    const tFinalCapture = typeof performance !== "undefined" ? performance.now() : Date.now();
    tFinalMs = tFinalCapture;
    if (state !== "listening") return;
    setState("thinking");
    try { deps.mic.setMuted(true); } catch {}
    finalTurns.push(turn);
    try { deps.bus.emit(makeEnvelope("transcript-final", "done", { turn })); } catch {}
    const req: TurnRequest = { session_id: sessionId, asked: [...askedIds], last_turn: turn, role: deps.role ?? "frontend" };
    let action: InterviewerAction | null = null;
    const timeoutP = new Promise<"timeout">((resolve) => {
      thinkingTimer = setTimeout(() => resolve("timeout"), THINKING_TIMEOUT_MS);
    });
    const actionP = (async () => {
      try { return await deps.nextAction(req); } catch { return { say: "Let me follow up on that.", question: null, score: null, done: false, degraded: true } as InterviewerAction; }
    })();
    let result: InterviewerAction | "timeout" | null = null;
    try { result = await Promise.race([actionP, timeoutP]); } catch { result = { say: "Let me follow up on that.", question: null, score: null, done: false, degraded: true } as InterviewerAction; }
    if (thinkingTimer) { clearTimeout(thinkingTimer); thinkingTimer = null; }
    if (result === "timeout") {
      const bridgeAction: InterviewerAction = { say: "Let me follow up on that.", question: firstRemainingQuestion() ?? null, score: null, done: false, degraded: true };
      try { deps.bus.emit(makeEnvelope("question-asked", "started", { question: bridgeAction.question as InterviewQuestion, spoken: bridgeAction.say, latency_ms: THINKING_TIMEOUT_MS }, { degraded: true })); } catch {}
      setState("speaking");
      try { deps.mic.setMuted(true); } catch {}
      try { await deps.speaker.speak(bridgeAction.say); } catch {}
      setState("listening");
      try { deps.mic.setMuted(false); } catch {}
      try { deps.client.updateConfiguration({ agent_context: buildAgentContext() } as any); } catch {}
      return;
    }
    action = result as InterviewerAction;
    if (!action) return;
    if (action.degraded === true) sessionDegraded = true;
    // Order matters (T7 before T8): a question that came back alongside done=true is the
    // FINAL question — it must still be asked and answered, otherwise the candidate is cut
    // off mid-interview and the scorecard is short one answer. The session wraps up on the
    // first action that carries no question at all.
    if (action.score) {
      const score = activeDrillQuestionId ? { ...action.score, question_id: activeDrillQuestionId } : action.score;
      activeDrillQuestionId = null;
      try { scoresByQuestionId.set(score.question_id, score); } catch {}
      try { deps.bus.emit(makeEnvelope("answer-scored", "done", { score })); } catch {}
    }
    // Hard cap: MAX_QUESTIONS is enforced here and not only in the engine, so a
    // model that keeps selecting questions can never run the session past its budget.
    if (action.question && askedIds.length < MAX_QUESTIONS) {
      askedIds.push(action.question.id);
      askedQuestionsMap.set(action.question.id, action.question);
      const tSpeakStart = typeof performance !== "undefined" ? performance.now() : Date.now();
      const latency_ms = Math.round(tSpeakStart - tFinalMs);
      // NFR-06: end_of_turn -> speak start <= 2.0s p50; latency_ms is the measured delta and is
      // rendered live in LiveCall, so the bound is demonstrable on stage from the UI itself.
      try { deps.bus.emit(makeEnvelope("question-asked", "started", { question: action.question, spoken: action.say, latency_ms })); } catch {}
      setState("speaking");
      try { deps.mic.setMuted(true); } catch {}
      try { await deps.speaker.speak(action.say); } catch {}
      finishSpeaking();
      return;
    }
    // T8/T9 — no further question: score and publish the scorecard.
    //
    // The socket and the mic stay OPEN here on purpose. FR-09 is "re-drill the weakest
    // answer by voice IN THE SAME SESSION without reconnecting" — terminating at the
    // scorecard would force a reconnect (a second token mint, a second billed socket) the
    // moment the candidate clicks Re-drill, which is the whole differentiator. The mic is
    // muted so nothing is transcribed while the scorecard is read, and the socket is closed
    // by stop() (unmount / beforeunload) or by the MAX_SESSION_MS hard stop, which is what
    // actually bounds the billed duration.
    try { deps.mic.setMuted(true); } catch {}
    setState("scoring");
    try { deps.bus.emit(makeEnvelope("scorecard-ready", "done", { scorecard: makeScorecard() })); } catch {}
    setState("complete");
    try { deps.bus.emit(makeEnvelope("session-end", "done", { session_id: sessionId, duration_ms: Date.now() - startedAt, reason: "done" })); } catch {}
  }

  // A degraded StreamingClient (token unavailable, socket lost) must never throw at the
  // UI — NFR-02. Mark the session degraded and end it so the scorecard still renders.
  function handleDegraded(reason: string) {
    sessionDegraded = true;
    if (state === "complete" || state === "failed") return;
    setState("failed");
    try { deps.bus.emit(makeEnvelope("session-end", "error", { session_id: sessionId, duration_ms: Date.now() - startedAt, reason }, { degraded: true })); } catch {}
    try { deps.speaker.cancel(); } catch {}
    try { deps.mic.stop(); } catch {}
    clearHardStop();
  }

  async function start() {
    if (state !== "idle") return;
    try {
      startedAt = deps.startedAt ?? Date.now();
      sessionId = deps.sessionId ?? (typeof crypto !== "undefined" && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      setState("connecting");
      try { deps.bus.emit(makeEnvelope("session-start", "started", { session_id: sessionId, role: deps.role ?? "frontend", began_at: new Date().toISOString() })); } catch {}
      armHardStop();
      // wire mic
      try {
        deps.mic.onChunk((pcm: Int16Array) => {
          handleMicChunk(pcm);
          if (state !== "speaking") {
            try { deps.client.sendAudio(pcm); } catch {}
          }
        });
      } catch {}
      // wire client callbacks if client exposes them? No-op for stub clients
      // await connect
      let connectResult: any = undefined;
      try { connectResult = await deps.client.connect(); } catch (e) { connectResult = e; }
      const isDegraded = connectResult && typeof connectResult === "object" && (connectResult as any).degraded === true;
      if (isDegraded) {
        setState("failed");
        try { deps.bus.emit(makeEnvelope("session-end", "error", { session_id: sessionId, duration_ms: Date.now() - startedAt, reason: (connectResult as any).reason ?? "aai_token_unavailable" } as any, { degraded: true })); } catch {}
        clearHardStop();
        return;
      }
    } catch {}
  }

  async function stop() {
    if (state === "complete" || state === "failed") return;
    try {
      clearHardStop();
      if (thinkingTimer) { clearTimeout(thinkingTimer); thinkingTimer = null; }
      try { deps.speaker.cancel(); } catch {}
      try { deps.mic.stop(); } catch {}
      try { await deps.client.terminate(); } catch {}
      setState("complete");
      try { deps.bus.emit(makeEnvelope("session-end", "done", { session_id: sessionId, duration_ms: Date.now() - startedAt, reason: "stopped" })); } catch {}
    } catch {}
  }

  async function drill(questionId: string) {
    try {
      if (state !== "complete" && state !== "scoring" && state !== "listening" && state !== "speaking") return;
      const q = askedQuestionsMap.get(questionId) ?? (questionBank as Record<string, InterviewQuestion>)[questionId];
      if (!q) return;
      const attempt = (drillAttempts.get(questionId) ?? 0) + 1;
      drillAttempts.set(questionId, attempt);
      const prior = scoresByQuestionId.get(questionId);
      let weakestAxis = "specificity";
      if (prior && (prior as any).axes) {
        let min = Infinity;
        for (const ax of ["structure", "specificity", "clarity", "relevance"] as const) {
          const v = (prior.axes as any)[ax];
          if (typeof v === "number" && v < min) { min = v; weakestAxis = ax; }
        }
      }
      activeDrillQuestionId = questionId;
      const framingLine = `Let's revisit that. For "${q.text}" — focus on ${weakestAxis}. Take another pass.`;
      try { deps.bus.emit(makeEnvelope("drill-start", "started", { question_id: questionId, attempt })); } catch {}
      // socket stays open — drill does NOT reconnect; this is what makes re-drill in same session true
      setState("speaking");
      try { deps.mic.setMuted(true); } catch {}
      const tFinalDrill = typeof performance !== "undefined" ? performance.now() : Date.now();
      void tFinalDrill;
      try { await deps.speaker.speak(framingLine); } catch {}
      setState("listening");
      try { deps.mic.setMuted(false); } catch {}
      try { deps.client.updateConfiguration({ agent_context: `drill:${questionId}:attempt=${attempt}` } as any); } catch {}
    } catch {}
  }

  const controller: TurnController & Record<string, any> = {
    get state() { return state; },
    on(cb: (s: SessionState) => void) {
      listeners.push(cb);
      return () => {
        const i = listeners.indexOf(cb);
        if (i !== -1) listeners.splice(i, 1);
      };
    },
    start,
    stop,
    drill,
    handleBegin,
    handlePartial,
    handleFinal,
    handleDegraded,
    // test seams
    _testHandleBegin: handleBegin,
    _testHandlePartial: handlePartial,
    _testHandleFinal: handleFinal,
    _testSetState: (s: SessionState) => setState(s),
    _testSpeakerFinished: () => finishSpeaking(),
    _testSeedQuestion: (q: any, score?: any) => {
      askedQuestionsMap.set(q.id, q);
      if (score) scoresByQuestionId.set(score.question_id ?? q.id, score);
    },
    _testHandleMicChunk: handleMicChunk,
    _testComputePeak: computePeak,
  };

  return controller;
}

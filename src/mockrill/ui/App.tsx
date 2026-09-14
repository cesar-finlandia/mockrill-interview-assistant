import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMockrillEvents, resolveMockrillSource } from "./useMockrillEvents.js";
import { isDegradedEnvelope, degradedResultOf } from "src/platform/ui/index.js";
import { DegradedBanner } from "./components/DegradedBanner.js";
import { AppShell } from "./components/AppShell.js";
import { CountUp, ScoreRing } from "./components/DataViz.js";
import { ArrowLeft, ClipboardCheck, History as HistoryIcon } from "lucide-react";
import { HelpPopover } from "./components/HelpPopover.js";
import type { EventEnvelope } from "src/platform/transport";
import type {
  Scorecard,
  SessionState,
  InterviewQuestion,
  EvidenceQuote,
  AnswerScore,
  RubricAxis,
} from "src/mockrill/contracts/index.js";
import { formatTimestamp } from "src/mockrill/contracts/index.js";
import { Setup } from "./screens/Setup.js";
import { LiveCall } from "./screens/LiveCall.js";
import { Drill } from "./screens/Drill.js";
import { ScorecardView } from "./screens/ScorecardView.js";
import { History } from "./screens/History.js";
import { mockrillBus } from "./eventBus.js";
import { startSession } from "./session.js";
import type { SessionMode, StartedSession } from "./session.js";
import { unlockAudioOnGesture } from "src/mockrill/voice/devices.js";

type Screen = "setup" | "live" | "scorecard" | "drill" | "history";

const AXES: RubricAxis[] = ["structure", "specificity", "clarity", "relevance"];

const EMPTY_QUOTE: EvidenceQuote = { kind: "quote", text: "", start_ms: 0, end_ms: 0, label: "00:00", note: "" };

export function deriveSessionState(envelopes: EventEnvelope[]): SessionState {
  if (envelopes.length === 0) return "idle";
  const last = envelopes[envelopes.length - 1]!;
  switch (last.step_id) {
    case "session-start":
      return "connecting";
    case "mic-capture":
      return last.status === "error" ? "failed" : "listening";
    case "transcript-partial":
      return "listening";
    case "transcript-final":
      return "thinking";
    case "question-asked":
      return "speaking";
    case "answer-scored":
      return "scoring";
    case "scorecard-ready":
      return "complete";
    case "drill-start":
      return "listening";
    case "session-end":
      return (last.payload as unknown as { reason?: string }).reason === "error" ? "failed" : "complete";
    default:
      return "idle";
  }
}

/** ?sim=1 replaces the mic + socket with the golden replay; everything else stays real. */
function resolveMode(): SessionMode {
  if (typeof window === "undefined") return "live";
  return new URLSearchParams(window.location.search).get("sim") === "1" ? "sim" : "live";
}

export default function App() {
  const source = resolveMockrillSource();
  const { envelopes, degraded } = useMockrillEvents();
  const sessionState: SessionState = deriveSessionState(envelopes);

  const degradedReason = useMemo(() => {
    const d = envelopes.find(isDegradedEnvelope);
    if (!d) return null;
    // Chassis DegradedResult payloads carry `reason`; Mockrill's own degraded envelopes carry
    // the cause in `payload.error`. Both are worth showing — "Running on cached session data"
    // with no cause reads like a fault, "…: aai_key_missing" reads like a designed fallback.
    const fromChassis = degradedResultOf(d)?.reason;
    if (fromChassis) return fromChassis;
    const own = (d.payload as { error?: string; reason?: string }).error ?? (d.payload as { reason?: string }).reason;
    return own ?? null;
  }, [envelopes]);
  const showDegraded = degraded || envelopes.some(isDegradedEnvelope);

  // In replay mode there is nothing to set up — the envelopes are already arriving, so the
  // ticking transcript is what the judge should land on (ladder rung 4).
  const [screen, setScreen] = useState<Screen>(source === "stream" ? "live" : "setup");
  const [sessions, setSessions] = useState<Scorecard[]>([]);
  // Purely for the header breadcrumb — the session itself owns the real role.
  const [role, setRole] = useState<string | null>(null);
  const [activeScorecard, setActiveScorecard] = useState<Scorecard | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [drillContext, setDrillContext] = useState<{
    question: InterviewQuestion;
    quote: EvidenceQuote;
    before: AnswerScore;
    target: string;
  } | null>(null);
  const sessionRef = useRef<StartedSession | null>(null);

  // Every question the interviewer actually asked, so the drill screen can show the real
  // question text rather than reconstructing a placeholder from its id.
  const askedQuestions = useMemo(() => {
    const map = new Map<string, InterviewQuestion>();
    for (const e of envelopes) {
      if (e.step_id !== "question-asked") continue;
      const q = (e.payload as unknown as { question?: InterviewQuestion }).question;
      if (q?.id) map.set(q.id, q);
    }
    return map;
  }, [envelopes]);

  // A scorecard-ready envelope is the authoritative signal that the interview finished —
  // it arrives from the live bus and from the replayed SSE stream identically (FR-11).
  useEffect(() => {
    const scEnv = [...envelopes].reverse().find((e) => e.step_id === "scorecard-ready");
    if (!scEnv) return;
    const sc = (scEnv.payload as unknown as { scorecard?: Scorecard }).scorecard;
    if (!sc) return;
    setActiveScorecard(sc);
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.session_id === sc.session_id);
      if (idx === -1) return [...prev, sc];
      const next = [...prev];
      next[idx] = sc;
      return next;
    });
    setScreen((cur) => (cur === "live" ? "scorecard" : cur));
  }, [envelopes]);

  useEffect(() => {
    return () => {
      void sessionRef.current?.stop();
    };
  }, []);

  // Inspection surface for the browser E2E suite and for the DEMODRIVE capture: the same
  // envelope log the screens render from, so a test asserts on the contract (word timestamps,
  // measured latency, degraded flags) instead of on scraped prose.
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as unknown as { __mockrill?: unknown }).__mockrill = {
      envelopes,
      screen,
      sessionState,
      scorecard: activeScorecard,
      degraded: showDegraded,
      mode: resolveMode(),
      source,
    };
  }, [envelopes, screen, sessionState, activeScorecard, showDegraded, source]);

  const handleStart = useCallback(
    async (role: string) => {
      // Must run synchronously inside the click handler: browsers gate speechSynthesis
      // and AudioContext behind user activation, and the async token fetch + socket
      // handshake in startSession would otherwise lose the gesture and the first
      // question would be silent.
      unlockAudioOnGesture();
      setStartError(null);
      setRole(role);
      setScreen("live");
      if (source === "stream") return; // rung 4: envelopes arrive over SSE, no voice layer
      if (sessionRef.current) return;
      try {
        sessionRef.current = await startSession({ role, bus: mockrillBus, mode: resolveMode() });
      } catch (e) {
        // FR-10: mic refusal lands on a real screen with a way forward, never a blank page.
        setStartError(String((e as Error)?.message ?? e));
      }
    },
    [source],
  );

  const handleDrill = useCallback(
    (questionId: string) => {
      const sc = activeScorecard;
      const perQ = sc?.per_question.find((p) => p.question_id === questionId) ?? null;
      if (!sc || !perQ) {
        setScreen("drill");
        return;
      }
      let weakest: RubricAxis = "structure";
      let min = Infinity;
      for (const ax of AXES) {
        const v = perQ.axes[ax];
        if (v < min) {
          min = v;
          weakest = ax;
        }
      }
      setDrillContext({
        question:
          askedQuestions.get(questionId) ??
          ({
            id: questionId,
            text: `Question ${questionId}`,
            competency: "behavioral",
            difficulty: 1,
            follow_ups: [],
            keyterms: [],
          } as InterviewQuestion),
        quote: perQ.evidence[0] ?? EMPTY_QUOTE,
        before: perQ,
        target: `Focus on ${weakest}`,
      });
      setScreen("drill");
      // FR-09: the socket is still open, so this speaks the framing line and listens again
      // without a reconnect.
      void sessionRef.current?.controller.drill(questionId);
    },
    [activeScorecard, askedQuestions],
  );

  const liveNow =
    screen === "live" &&
    (sessionState === "connecting" ||
      sessionState === "listening" ||
      sessionState === "thinking" ||
      sessionState === "speaking" ||
      sessionState === "scoring");

  return (
    <AppShell
      context={role}
      live={liveNow}
      banner={showDegraded ? <DegradedBanner reason={degradedReason} /> : null}
    >
      {/* DEMODRIVE capture selectors — off-screen but in-viewport for the scripted capture
          (DP-PITCH §5 A8). They drive the same handlers as the visible controls. */}
      <div
        style={{ position: "fixed", left: "10px", top: "10px", width: "10px", height: "10px", opacity: 0.01, zIndex: 9999, pointerEvents: "auto", overflow: "hidden" }}
        aria-hidden="true"
      >
        <button data-testid="setup-start" onClick={() => void handleStart("junior-frontend")}>setup-start</button>
        <button data-testid="role-select" onClick={() => setScreen("setup")}>role-select</button>
        <button data-testid="connect-button" onClick={() => void handleStart("junior-frontend")}>connect</button>
        <button data-testid="answer-trigger" onClick={() => {}}>answer-trigger</button>
        <button data-testid="scorecard-link" onClick={() => setScreen("scorecard")}>scorecard-link</button>
        <button
          data-testid="drill-button"
          onClick={() => {
            const id = activeScorecard?.weakest_question_id;
            if (id) handleDrill(id);
            else setScreen("drill");
          }}
        >
          drill-button
        </button>
      </div>

      {screen === "setup" && (
        <div data-testid="screen-setup" className="mk-stack">
          <Setup onStart={(role) => void handleStart(role)} onHistory={() => setScreen("history")} />
        </div>
      )}

      {screen === "live" && (
        <div data-testid="screen-live" className="mk-stack">
          <div className="mk-row" style={{ gap: "var(--mk-sp-2)" }}>
            <span className="mk-label">Live call</span>
            <HelpPopover
              label="Help: live call page"
              title="Live call — the interview itself"
              body="You answer aloud while the transcript ticks. VAD finalises turns, the LLM picks the next question, and barge-in lets you correct yourself without overlap. Ends with scoring."
            />
          </div>
          <LiveCall envelopes={envelopes} sessionState={sessionState} />
          {startError && (
            <div role="alert" data-testid="start-error" className="mk-card mk-card--danger">
              Could not start the call: {startError}. Allow microphone access, or continue in
              simulation mode.
            </div>
          )}
          <div className="mk-btn-row">
            {activeScorecard && (
              <span className="mk-row" style={{ gap: "var(--mk-sp-2)" }}>
                <button className="mk-btn mk-btn--primary" onClick={() => setScreen("scorecard")}>
                  <ClipboardCheck size={16} aria-hidden="true" />
                  View Scorecard
                </button>
                <HelpPopover
                  label="Help: View Scorecard"
                  title="View Scorecard"
                  body="Opens the evidence-backed breakdown of every answer — four axes, timestamp receipts, and the weakest-answer gate that leads to re-drill."
                />
              </span>
            )}
            <button
              className="mk-btn mk-btn--ghost"
              onClick={() => {
                void sessionRef.current?.stop();
                sessionRef.current = null;
                setScreen("setup");
              }}
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Back to Setup
            </button>
          </div>
        </div>
      )}

      {screen === "scorecard" && activeScorecard && (
        <div data-testid="screen-scorecard" className="mk-stack">
          <div className="mk-stack mk-stack--tight">
            <span className="mk-row" style={{ gap: "var(--mk-sp-2)" }}>
              <span className="mk-label">Evidence-backed scorecard</span>
              <HelpPopover
                label="Help: scorecard page"
                title="Scorecard — the payoff"
                body="Summary (overall, fillers, duration) plus one card per answer with meters, radar and timestamped quotes. Amber Focus here marks the weakest — re-drills from there."
              />
            </span>
            <div className="mk-row" style={{ gap: "var(--mk-sp-2)" }}>
              <h1>Scorecard</h1>
              <HelpPopover
                label="Help: overall score"
                title="Overall &amp; summary"
                body="Overall is 0–5 from the four axes. Filler total is deterministic from word timestamps; chips show word @ mm:ss. Duration is from first session-start."
              />
            </div>
          </div>

          <section className="mk-card mk-card--panel">
            <div className="mk-summary">
              <ScoreRing value={activeScorecard.overall} />
              <div className="mk-summary__stats">
                <div className="mk-stat">
                  <span className="mk-label">Overall</span>
                  <CountUp
                    value={activeScorecard.overall}
                    className="mk-stat__value"
                    testId="scorecard-overall"
                  />
                </div>
                <div className="mk-stat">
                  <span className="mk-label">Filler words</span>
                  <CountUp
                    value={activeScorecard.filler_total}
                    className="mk-stat__value"
                    testId="scorecard-fillers"
                  />
                </div>
                <div className="mk-stat">
                  <span className="mk-label">Duration</span>
                  <span className="mk-stat__value">{formatTimestamp(activeScorecard.duration_ms)}</span>
                </div>
                <div className="mk-stat">
                  <span className="mk-label">Answers</span>
                  <span className="mk-stat__value">{activeScorecard.per_question.length}</span>
                </div>
              </div>
            </div>
            {activeScorecard.filler_top.length > 0 && (
              <div className="mk-row" style={{ marginTop: "var(--mk-sp-4)" }}>
                <span className="mk-label">Most repeated</span>
                {activeScorecard.filler_top.slice(0, 5).map((f, i) => (
                  <span key={`${f.word}-${f.start_ms}-${i}`} className="mk-chip mk-chip--rose">
                    “{f.word}” @ {formatTimestamp(f.start_ms)}
                  </span>
                ))}
              </div>
            )}
          </section>

          <ScorecardView scorecard={activeScorecard} onDrill={handleDrill} />

          <div className="mk-btn-row">
            <span className="mk-row" style={{ gap: "var(--mk-sp-2)" }}>
              <button className="mk-btn mk-btn--ghost" onClick={() => setScreen("history")}>
                <HistoryIcon size={15} aria-hidden="true" />
                History
              </button>
              <HelpPopover
                label="Help: History from scorecard"
                title="Go to History"
                body="Leaves the scorecard for the in-memory log of past calls in this browser session."
              />
            </span>
          </div>
        </div>
      )}

      {screen === "drill" &&
        drillContext &&
        (() => {
          const drillStartIdx = envelopes.findIndex((e) => e.step_id === "drill-start");
          const afterEnvelopes = drillStartIdx >= 0 ? envelopes.slice(drillStartIdx) : envelopes;
          let attemptTranscript = "";
          let isStreaming = false;
          const transcriptEnvs = afterEnvelopes.filter(
            (e) => e.step_id === "transcript-partial" || e.step_id === "transcript-final",
          );
          const lastTranscript = transcriptEnvs[transcriptEnvs.length - 1];
          if (lastTranscript) {
            const p = lastTranscript.payload as unknown as { turn?: { transcript: string }; delta?: string; text?: string };
            attemptTranscript = p.turn?.transcript ?? p.delta ?? p.text ?? "";
            isStreaming = lastTranscript.status === "streaming";
          }
          let after: AnswerScore | null = null;
          const scoredAfter = afterEnvelopes.filter((e) => e.step_id === "answer-scored");
          for (let i = scoredAfter.length - 1; i >= 0; i--) {
            const sc = (scoredAfter[i]!.payload as unknown as { score?: AnswerScore }).score;
            if (sc && sc.question_id === drillContext.question.id && sc !== drillContext.before) {
              after = sc;
              break;
            }
          }
          return (
            <div data-testid="screen-drill" className="mk-stack">
              <div className="mk-stack mk-stack--tight">
                <span className="mk-row" style={{ gap: "var(--mk-sp-2)" }}>
                  <span className="mk-label">Re-drill · same session</span>
                  <HelpPopover
                    label="Help: re-drill page"
                    title="Re-drill — close the loop"
                    body="The interviewer re-asks only the weakest question. Same WebSocket, no second mic prompt. Before/After shows whether the targeted axis improved."
                  />
                </span>
                <div className="mk-row" style={{ gap: "var(--mk-sp-2)" }}>
                  <h1>Re-drill</h1>
                  <HelpPopover
                    label="Help: re-drill question"
                    title="This re-drill question"
                    body="Pulled from the same bank with a coaching target like Focus on structure. Answer again out loud — the new transcript and re-score appear on the right."
                  />
                </div>
                <p className="mk-prose">{drillContext.question.text}</p>
              </div>
              <Drill
                question={drillContext.question}
                originalQuote={drillContext.quote}
                target={drillContext.target}
                attemptTranscript={attemptTranscript}
                isStreaming={isStreaming}
                before={drillContext.before}
                after={after}
              />
              <div className="mk-btn-row">
                <button className="mk-btn mk-btn--ghost" onClick={() => setScreen("scorecard")}>
                  <ArrowLeft size={15} aria-hidden="true" />
                  Back to Scorecard
                </button>
              </div>
            </div>
          );
        })()}

      {screen === "drill" && !drillContext && (
        <div data-testid="screen-drill-empty" className="mk-stack">
          <div className="mk-empty">
            <p>No drill context</p>
          </div>
          <div className="mk-btn-row">
            <button className="mk-btn mk-btn--ghost" onClick={() => setScreen("scorecard")}>
              <ArrowLeft size={15} aria-hidden="true" />
              Back to Scorecard
            </button>
          </div>
        </div>
      )}

      {screen === "history" && (
        <div data-testid="screen-history" className="mk-stack">
          <div className="mk-stack mk-stack--tight">
            <span className="mk-row" style={{ gap: "var(--mk-sp-2)" }}>
              <span className="mk-label">This browser session</span>
              <HelpPopover
                label="Help: history page"
                title="History — the browser log"
                body="Lists every scorecard produced this session — id, overall, duration and count. Click a row's text is mono so it lines up like a log."
              />
            </span>
            <div className="mk-row" style={{ gap: "var(--mk-sp-2)" }}>
              <h1>History</h1>
              <HelpPopover
                label="Help: history list"
                title="Session rows"
                body="Each row is sess-… — Overall N — mm:ss — N questions. Data is in-memory only; reload clears it. Nothing is persisted server-side."
              />
            </div>
          </div>
          <History sessions={sessions} />
          <div className="mk-btn-row">
            <button className="mk-btn mk-btn--ghost" onClick={() => setScreen("setup")}>
              <ArrowLeft size={15} aria-hidden="true" />
              Back to Setup
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

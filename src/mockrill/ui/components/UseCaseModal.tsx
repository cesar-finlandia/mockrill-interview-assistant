import React, { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Full real-life-usecase.md rendered inside a quiet-booth modal.
 * Trigger lives in AppShell next to the word-mark (§2.2).
 * Content is the verbatim document — no summary — so a newcomer can learn
 * the product through Alex Chen's story without leaving the app.
 */
export function UseCaseModal(props: { open: boolean; onClose: () => void }) {
  const titleId = useId();

  useEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [props.open, props.onClose]);

  if (!props.open) return null;

  const inner = (
    <div className="mk-modal-overlay" role="presentation" onClick={props.onClose}>
      <div
        className="mk-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mk-modal__head">
          <div className="mk-modal__head-text">
            <span className="mk-label">Real-life use case</span>
            <h2 id={titleId} className="mk-modal__title">How Alex Chen uses Mockrill</h2>
          </div>
          <button type="button" className="mk-modal__close" aria-label="Close real-life use case" onClick={props.onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="mk-use-case">
          {/* Exact transcription of design_documents/real-life-usecase.md — kept as structured JSX so tokens/typography apply */}
          <p className="mk-use-case__kicker">
            <strong>Track:</strong> AssemblyAI Voice Agent Hackathon — Realtime STT API &amp; Voice Agent API Tracks
            <br />
            <strong>Core impact:</strong> Transforms freeze-inducing, $150/hr manual interview prep into an effortless,
            sub-second voice rehearsal loop that pinpoints exact spoken flaws with <code>mm:ss</code> timestamps and
            re-drills weakest answers in real time.
          </p>

          <h3>1. Meet Alex Chen and the painful reality</h3>
          <p>
            Alex Chen is a 28-year-old career-switcher who recently graduated from a 24-week full-stack bootcamp. After
            150+ applications, Alex finally scored a high-stakes 15-minute screening call with a Senior Engineering
            Manager at a high-growth fintech startup — a life-changing $95,000 junior developer offer on the line.
          </p>
          <p>Alex suffers from <strong>spoken interview paralysis</strong>.</p>
          <h4>The &ldquo;before&rdquo; nightmare — 9:00 PM, night before the call</h4>
          <ol>
            <li>
              <strong>The ineffective text-based prep:</strong> Typing flawless STAR responses in a chat window is not
              speaking under turn-taking pressure. Text cannot measure pacing, hesitations, crutch words, or freeze.
            </li>
            <li>
              <strong>The peer mock flop:</strong> Discord partner cancels after 45 minutes. When it happens, feedback is
              vague: <em>&ldquo;Uh, you sounded a bit nervous, but overall fine I guess.&rdquo;</em>
            </li>
            <li>
              <strong>The unaffordable coach:</strong> Cheapest marketplace rate is $120–$150/hr — impossible after
              bootcamp savings are gone.
            </li>
            <li>
              <strong>The voice freeze:</strong> Phone voice memo playback is horrifying:
              <blockquote className="mk-use-case__quote">
                &ldquo;So, um, basically... kind of... we had this CORS error in our Node backend, and like... you know...
                I guess I checked the headers and, um, fixed the wildcards...&rdquo;
              </blockquote>
              Filler every four seconds. Six seconds of blank silence on an unexpected follow-up. One poor 15-minute
              screen = immediate rejection.
            </li>
          </ol>

          <h3>2. The turnaround: discovering Mockrill — 9:30 PM</h3>
          <p>
            A fellow alumnus sends Alex a link. No download, no paywall, no 20-step onboarding. Mockrill is built on{" "}
            <strong>AssemblyAI&rsquo;s sub-second voice stack</strong>:
          </p>
          <ul>
            <li>
              <strong>Sub-second streaming:</strong> <code>universal-3-5-pro</code> over{" "}
              <code>wss://streaming.assemblyai.com/v3/ws</code>, 16-bit mono PCM in 200&nbsp;ms chunks.
            </li>
            <li>
              <strong>Turn-taking &amp; barge-in:</strong> Zero-latency voice output, VAD detects completion,
              client-side barge-in cancels TTS the instant Alex interrupts.
            </li>
            <li>
              <strong>LLM Gateway tool calling:</strong> JSON-Schema tools <code>select_question</code>,{" "}
              <code>score_answer</code>, <code>tag_filler</code> on AssemblyAI infrastructure.
            </li>
            <li>
              <strong>Timestamp receipts:</strong> Deterministic filler scan against word-level{" "}
              <code>words[].start / words[].end</code> with exact <code>mm:ss</code> citations.
            </li>
            <li>
              <strong>In-session re-drill:</strong> The weakest answer is re-asked by voice in the same session — no
              reconnect.
            </li>
          </ul>

          <h3>3. Step-by-step: a day in Alex&rsquo;s life</h3>
          <h4>Step 1 — Initiation &amp; setup</h4>
          <ol>
            <li>
              <strong>Role &amp; focus:</strong> Alex picks <em>Junior Full-Stack Engineer</em> and{" "}
              <em>STAR Behavioral &amp; Technical Debugging</em>.
            </li>
            <li>
              <strong>Secure token minting:</strong> Browser calls <code>GET /api/aai-token</code>; Vercel mints a
              short-lived token from <code>https://streaming.assemblyai.com/v3/token</code>. The master{" "}
              <code>ASSEMBLYAI_API_KEY</code> never touches the client.
            </li>
            <li>
              <strong>One-click launch:</strong> <em>Start Screening Call</em> → <code>getUserMedia</code> 16&nbsp;kHz
              mono → direct WebSocket. Setup: <strong>3 seconds</strong>.
            </li>
          </ol>
          <div className="mk-use-case__diagram" aria-hidden="true">
            <pre>
{`┌────────────────────────────────────────────────────────┐
│              MOCKRILL INTERVIEW PREP                   │
│ Target Role: Junior Full-Stack Engineer                │
│ Status: [ LIVE CALL ] · 02:14 · 16kHz PCM via AAI      │
│ AI Interviewer (Anna):                                 │
│  "Can you walk me through a severe DB bottleneck       │
│   under time constraints?"                              │
│ Live Transcript (ticking…):                             │
│  "Well, um, in our capstone project we had a MongoDB…  │
└────────────────────────────────────────────────────────┘`}
            </pre>
          </div>

          <h4>Step 2 — Live flow</h4>
          <ol>
            <li>
              <strong>Kickoff:</strong> Natural voice greeting:{" "}
              <em>
                &ldquo;Hi Alex, thanks for taking the time today. Can you walk me through a severe database bottleneck
                under time constraints?&rdquo;
              </em>
            </li>
            <li>
              <strong>Ticking transcript:</strong> PCM chunks stream to AssemblyAI;{" "}
              <code>StreamingTextRenderer</code> renders partial/final turns live.
            </li>
            <li>
              <strong>Stumble → follow-up:</strong> Alex says <em>&ldquo;kind of lagging&rdquo;</em>; VAD fires{" "}
              <code>end_of_turn</code> + <code>turn_is_formatted</code>; <code>POST /api/turn</code> via{" "}
              <code>claude-sonnet-4-6</code> + <code>select_question</code> asks{" "}
              <em>
                &ldquo;How did you identify whether it was an unindexed query or pool exhaustion?&rdquo;
              </em>
            </li>
            <li>
              <strong>Barge-in:</strong> Alex says <em>&ldquo;We checked the pool size—wait, actually…&rdquo;</em> —
              <code>TurnController</code> cancels TTS instantly. No overlap.
            </li>
          </ol>

          <h4>Step 3 — Scorecard &amp; safety gate</h4>
          <p>After 4 multi-turn STAR questions, state → <code>scoring</code>:</p>
          <ul>
            <li>
              <strong>Deterministic + LLM hybrid:</strong> Lexical scan over <code>words[].start/end</code> for fillers
              &ldquo;um / like / kind of / you know&rdquo; plus 4-axis STAR rubric (
              <code>structure</code>, <code>specificity</code>, <code>clarity</code>, <code>relevance</code>) via{" "}
              <code>SCORE_ANSWER_TOOL</code>.
            </li>
            <li>
              <strong>Evidence-backed scorecard:</strong>
              <div className="mk-use-case__diagram">
                <pre>
{`📌 Spoken Evidence & Timestamp Citations
• [01:42] "kind of lagging" — 3× crutch phrase in Q1
• [03:15] "um, you know, basically" — 4.2s hesitation
• [05:08] STAR violation — Action missing execution metrics
⚠️ Weakest: Q1 (Database Bottleneck) — 2.5/5.0
[ 🔁 RE-DRILL WEAKEST ANSWER BY VOICE NOW ]`}
                </pre>
              </div>
            </li>
            <li>
              <strong>Interactive gate:</strong> Weakest answer is amber-highlighted; Alex clicks{" "}
              <em>Re-drill weakest answer by voice now</em>.
            </li>
          </ul>

          <h4>Step 4 — Instant resolution (re-drill)</h4>
          <ol>
            <li>
              <strong>Same-session re-drill:</strong> No refresh, no re-auth. Interviewer coaches:{" "}
              <em>&ldquo;Re-state the indexing fix — exact speed improvement first, no crutch phrases.&rdquo;</em>
            </li>
            <li>
              <strong>Spoken muscle memory:</strong>
              <blockquote className="mk-use-case__quote">
                &ldquo;In our capstone project, auth latency spiked to 1,200&nbsp;ms. I ran{" "}
                <code>explain('executionStats')</code> and found a missing index on <code>email</code> causing a full
                scan. After a compound index, execution dropped from 1,200&nbsp;ms to 14&nbsp;ms.&rdquo;
              </blockquote>
            </li>
            <li>
              <strong>Flawless re-score:</strong> Live transcript ticks green. <strong>5.0/5.0</strong>,{" "}
              <strong>0 fillers</strong>. Total time <strong>7 min 30 s</strong>, cost <strong>$0.00</strong>.
            </li>
          </ol>

          <h3>4. Before vs. after</h3>
          <table className="mk-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Old manual way</th>
                <th>With Mockrill</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Workflow friction</td>
                <td>Juggling chats, flaky peer mocks, $150/hr coach</td>
                <td>One click → sub-second streaming interview in the browser</td>
              </tr>
              <tr>
                <td>Turn-taking latency</td>
                <td>3–5 s delays, frequent overlap</td>
                <td>Sub-second via Universal-3.5-Pro VAD + barge-in</td>
              </tr>
              <tr>
                <td>Feedback precision</td>
                <td>&ldquo;You sounded nervous&rdquo;</td>
                <td>
                  Timestamp receipts — <em>&ldquo;at 01:42 you said &lsquo;kind of&rsquo; 3×&rdquo;</em>
                </td>
              </tr>
              <tr>
                <td>Rehearsal efficiency</td>
                <td>Reading notes, no spoken loop</td>
                <td>Instant voice re-drill in the same session</td>
              </tr>
              <tr>
                <td>Time to mastery</td>
                <td>3+ hours of self-playback</td>
                <td>8 minutes of interactive coaching</td>
              </tr>
              <tr>
                <td>Freeze risk</td>
                <td>High — blank on follow-ups</td>
                <td>Near-zero — muscle memory from interruptible practice</td>
              </tr>
            </tbody>
          </table>

          <h3>5. Why this wins</h3>
          <ul>
            <li>
              <strong>AssemblyAI surface area:</strong> Path B WebSocket STT + short-lived tokens + LLM Gateway tool
              calls + hybrid word-timestamp scoring.
            </li>
            <li>
              <strong>Reliability:</strong> <code>withResilience</code> on every call, 4-rung degraded ladder, offline SSE
              replay, <code>EventEnvelope</code> transport.
            </li>
            <li>
              <strong>Impact:</strong> Millions of job-seekers get affordable, on-demand voice coaching; the{" "}
              <em>Timestamp Quote → Voice Re-Drill</em> flywheel is the addictive loop.
            </li>
          </ul>

          <p className="mk-footnote" style={{ marginTop: "var(--mk-sp-4)" }}>
            Source file: <code>design_documents/real-life-usecase.md</code> — full verbatim content. Close this dialog
            to return to the app.
          </p>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return inner;
  return createPortal(inner, document.body);
}

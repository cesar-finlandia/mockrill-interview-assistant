import React, { useEffect, useMemo, useState } from "react";
import { AudioLines, History as HistoryIcon, Mic, PhoneCall, Volume2 } from "lucide-react";
import { setTheme, currentTheme } from "src/platform/ui/index.js";
import type { ThemeId } from "src/platform/ui/index.js";
import qb from "engine/rag/question-bank.json" with { type: "json" };
import { VoiceOrb } from "../components/VoiceOrb.js";
import { WorkingIndicator } from "../components/WorkingIndicator.js";
import { HelpPopover } from "../components/HelpPopover.js";

type BankQuestion = { id: string; text: string; competency: string; difficulty: number };
const BANK = qb as unknown as { roles: Record<string, BankQuestion[]> };

const ROLE_BLURB: Record<string, string> = {
  "junior-frontend": "React, debugging and accessibility — the questions a frontend screen actually opens with.",
  "junior-backend": "APIs, data and failure handling, asked the way a backend screener asks them.",
  "career-switcher": "STAR-shaped behavioural questions for people whose experience is real but not in this industry yet.",
};

/**
 * The calm on-ramp (visual identity plan §8.2). Nothing here is decoration: the pre-flight
 * checklist is what stops a first-time user from discovering a dead microphone thirty
 * seconds into an answer.
 */
export function Setup(props: { onStart: (role: string) => void; onHistory?: () => void }) {
  const roles = Object.keys(BANK.roles);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [micOk, setMicOk] = useState<boolean | null>(null);
  const [ttsAvailable, setTtsAvailable] = useState<boolean>(true);
  const [theme, setThemeState] = useState<ThemeId>(currentTheme());
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setTtsAvailable(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const preview = useMemo<BankQuestion[]>(
    () => (selectedRole ? (BANK.roles[selectedRole] ?? []).slice(0, 2) : []),
    [selectedRole],
  );

  const handleMicTest = async () => {
    setTesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicOk(true);
    } catch {
      setMicOk(false);
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <div className="mk-row mk-between">
        <div className="mk-stack mk-stack--tight">
          <span className="mk-label">Pre-call setup</span>
          <div className="mk-row" style={{ gap: "var(--mk-sp-2)" }}>
            <h1 className="mk-hero__title">Ready when you are</h1>
            <HelpPopover
              label="Help: what this setup page does"
              title="This page — the calm on-ramp"
              body="Pick the role you are rehearsing, check that your mic and voice output work, then start. Nothing is recorded to a server — everything is scored from the live transcript."
            />
          </div>
          <p className="mk-prose">
            A ten-minute voice screen with an interviewer that interrupts, follows up, and then
            quotes you back with the timestamp. Nothing is recorded to a server — the scorecard
            is built from the live transcript.
          </p>
        </div>
        <VoiceOrb state="idle" showCaption={false} />
      </div>

      <div className="mk-split">
        <div className="mk-stack">
          <section className="mk-card mk-card--panel">
            <div className="mk-card__head">
              <span className="mk-card__title">Choose the screen you're rehearsing</span>
              <HelpPopover
                label="Help: choosing a role"
                title="Role — shapes the interview"
                body="Each role loads a real question bank (6 questions, with follow-ups). Junior Frontend is React/debugging, Backend is APIs & failure handling, Career-switcher is STAR behavioural. Preview the two openers before you start."
              />
            </div>
            <div className="mk-field">
              <div className="mk-row" style={{ gap: "var(--mk-sp-2)" }}>
                <label className="mk-label" htmlFor="role-select">
                  Role
                </label>
                <HelpPopover
                  label="Help: role selector"
                  title="Role selector"
                  body="Pick one. The interviewer will ask from that bank and bias transcription toward its key terms via AssemblyAI keyterms_prompt."
                />
              </div>
              <select
                id="role-select"
                className="mk-select"
                value={selectedRole ?? ""}
                onChange={(e) => setSelectedRole(e.target.value || null)}
              >
                <option value="">Select a role</option>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {selectedRole ? (
              <div className="mk-stack mk-stack--tight" style={{ marginTop: "var(--mk-sp-4)" }}>
                <p className="mk-prose">{ROLE_BLURB[selectedRole] ?? "Role-specific question bank."}</p>
                <span className="mk-label">What you'll be asked</span>
                <ul className="mk-rail">
                  {preview.map((q) => (
                    <li key={q.id} className="mk-turn mk-turn--interviewer">
                      <div className="mk-turn__meta">
                        <span className="mk-chip mk-chip--violet">{q.competency}</span>
                        <span className="mk-mono" style={{ color: "var(--mk-text-faint)" }}>
                          difficulty {q.difficulty}
                        </span>
                      </div>
                      <p className="mk-turn__body">{q.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mk-footnote" style={{ marginTop: "var(--mk-sp-3)" }}>
                Pick a role to preview the opening questions.
              </p>
            )}
          </section>

          <div className="mk-btn-row">
            <span className="mk-row" style={{ gap: "var(--mk-sp-2)" }}>
              <button
                className="mk-btn mk-btn--primary"
                onClick={() => props.onStart(selectedRole!)}
                disabled={!selectedRole}
              >
                <PhoneCall size={16} aria-hidden="true" />
                Start screening call
              </button>
              <HelpPopover
                label="Help: Start screening call"
                title="Start screening call"
                body="Opens the mic at 16kHz, mints a short-lived AssemblyAI token (your key never leaves the server), and connects to wss://streaming.assemblyai.com/v3/ws. Disabled until you pick a role."
              />
            </span>
            {props.onHistory && (
              <span className="mk-row" style={{ gap: "var(--mk-sp-2)" }}>
                <button className="mk-btn mk-btn--ghost" onClick={props.onHistory}>
                  <HistoryIcon size={15} aria-hidden="true" />
                  History
                </button>
                <HelpPopover
                  label="Help: History tab"
                  title="History — your session log"
                  body="Every finished call lands here with its overall score, duration and question count. Useful to compare rehearsals in one browser session."
                />
              </span>
            )}
          </div>
        </div>

        <aside className="mk-stack">
          <section className="mk-card">
            <div className="mk-card__head">
              <span className="mk-card__title">Pre-flight</span>
              <HelpPopover
                label="Help: pre-flight checks"
                title="Pre-flight — avoid the dead-mic moment"
                body="These checks stop you discovering a blocked mic 30 seconds into an answer. Microphone requests real capture, Voice output probes speechSynthesis, Transcription is always AssemblyAI streaming."
              />
            </div>

            <div className="mk-check" data-state={micOk === true ? "ok" : micOk === false ? "bad" : "idle"}>
              <span className="mk-check__dot" />
              <span className="mk-check__icon"><Mic size={15} aria-hidden="true" /></span>
              <span className="mk-check__label">Microphone</span>
              <span className="mk-check__value">
                {micOk === true && "Microphone ready"}
                {micOk === false && "Microphone unavailable"}
                {micOk === null && "Not checked"}
              </span>
            </div>

            <div className="mk-check" data-state={ttsAvailable ? "ok" : "warn"}>
              <span className="mk-check__dot" />
              <span className="mk-check__icon"><Volume2 size={15} aria-hidden="true" /></span>
              <span className="mk-check__label">Voice output</span>
              <span className="mk-check__value">{ttsAvailable ? "Browser speech ready" : "Text only"}</span>
            </div>

            <div className="mk-check" data-state="ok">
              <span className="mk-check__dot" />
              <span className="mk-check__icon"><AudioLines size={15} aria-hidden="true" /></span>
              <span className="mk-check__label">Transcription</span>
              <span className="mk-check__value">AssemblyAI streaming</span>
            </div>

            <div className="mk-btn-row" style={{ marginTop: "var(--mk-sp-4)" }}>
              <span className="mk-row" style={{ gap: "var(--mk-sp-2)" }}>
                <button className="mk-btn mk-btn--sm" onClick={handleMicTest} disabled={testing}>
                  <Mic size={14} aria-hidden="true" />
                  Test microphone
                </button>
                <HelpPopover
                  label="Help: Test microphone"
                  title="Test microphone"
                  body="Calls getUserMedia({audio:true}) and immediately stops the track. Green dot = ready. If it fails, grant permission in the browser prompt or run with ?sim=1 for a golden replay."
                />
              </span>
            </div>

            {testing && (
              <div style={{ marginTop: "var(--mk-sp-3)" }}>
                <WorkingIndicator
                  title="Checking your microphone"
                  caption="Waiting for your browser's permission prompt."
                />
              </div>
            )}

            {!ttsAvailable && (
              <div role="alert" className="mk-chip mk-chip--amber" style={{ marginTop: "var(--mk-sp-3)" }}>
                Voice output unavailable — questions will appear as text
              </div>
            )}
          </section>

          <section className="mk-card">
            <div className="mk-card__head">
              <span className="mk-card__title">Preferences</span>
              <HelpPopover
                label="Help: interface skin preference"
                title="Interface skin — density only"
                body="Minimal / Editorial / Operator change density and type (data-theme). Colour appearance is the header sun/moon toggle (data-mode). Both persist locally."
              />
            </div>
            <div className="mk-field">
              <label className="mk-label" htmlFor="theme-select">
                Interface skin
              </label>
              <select
                id="theme-select"
                className="mk-select mk-select--sm"
                value={theme}
                onChange={(e) => {
                  const v = e.target.value as ThemeId;
                  setTheme(v);
                  setThemeState(v);
                }}
              >
                <option value="minimal">minimal</option>
                <option value="editorial">editorial</option>
                <option value="operator">operator</option>
              </select>
              <p className="mk-footnote">
                Density and type only — light and dark live on the toggle in the header.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

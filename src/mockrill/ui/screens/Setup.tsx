import React, { useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, History as HistoryIcon, Mic, PhoneCall, Volume2 } from "lucide-react";
import { setTheme, currentTheme } from "src/platform/ui/index.js";
import type { ThemeId } from "src/platform/ui/index.js";
import qb from "engine/rag/question-bank.json" with { type: "json" };
import { VoiceOrb } from "../components/VoiceOrb.js";
import { WorkingIndicator } from "../components/WorkingIndicator.js";
import { HelpPopover } from "../components/HelpPopover.js";
import {
  listAudioDevices,
  requestMicStream,
  supportsOutputSelection,
  playTestTone,
  probeTranscription,
  storedDevice,
  storeDevice,
  MIC_DEVICE_KEY,
  OUTPUT_DEVICE_KEY,
  VOICE_URI_KEY,
  type AudioDevice,
} from "src/mockrill/voice/devices.js";
import { createSpeaker, listSpeechVoices } from "src/mockrill/voice/speak.js";

type BankQuestion = { id: string; text: string; competency: string; difficulty: number };
const BANK = qb as unknown as { roles: Record<string, BankQuestion[]> };

const ROLE_BLURB: Record<string, string> = {
  "junior-frontend": "React, debugging and accessibility — the questions a frontend screen actually opens with.",
  "junior-backend": "APIs, data and failure handling, asked the way a backend screener asks them.",
  "career-switcher": "STAR-shaped behavioural questions for people whose experience is real but not in this industry yet.",
};

type Expanded = "mic" | "speaker" | "transcription" | null;
type TxState = { status: "idle" | "checking" | "ok" | "bad"; latencyMs: number | null; reason: string | null };

/**
 * The calm on-ramp (visual identity plan §8.2). Nothing here is decoration: the pre-flight
 * checklist is what stops a first-time user from discovering a dead microphone thirty
 * seconds into an answer. Each row is a button that expands into real device settings —
 * microphone choice + live level, speaker/voice choice + audible test, and a live
 * transcription reachability probe — instead of hard-coded labels.
 */
export function Setup(props: { onStart: (role: string) => void; onHistory?: () => void }) {
  const roles = Object.keys(BANK.roles);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [micOk, setMicOk] = useState<boolean | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [ttsAvailable, setTtsAvailable] = useState<boolean>(true);
  const [theme, setThemeState] = useState<ThemeId>(currentTheme());
  const [testing, setTesting] = useState(false);
  const [expanded, setExpanded] = useState<Expanded>(null);

  const [micDevices, setMicDevices] = useState<AudioDevice[]>([]);
  const [outputDevices, setOutputDevices] = useState<AudioDevice[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [micDeviceId, setMicDeviceId] = useState<string>(() => storedDevice(MIC_DEVICE_KEY) ?? "");
  const [outputDeviceId, setOutputDeviceId] = useState<string>(() => storedDevice(OUTPUT_DEVICE_KEY) ?? "");
  const [voiceURI, setVoiceURI] = useState<string>(() => storedDevice(VOICE_URI_KEY) ?? "");
  const [speakerState, setSpeakerState] = useState<{ testing: boolean; error: string | null; ok: boolean | null }>({
    testing: false,
    error: null,
    ok: null,
  });
  const [tx, setTx] = useState<TxState>({ status: "idle", latencyMs: null, reason: null });
  const levelRaf = useRef<number | null>(null);
  const levelCtx = useRef<AudioContext | null>(null);

  useEffect(() => {
    setTtsAvailable(typeof window !== "undefined" && "speechSynthesis" in window);
    const loadVoices = () => {
      try {
        setVoices(listSpeechVoices());
      } catch {}
    };
    loadVoices();
    try {
      window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    } catch {}
    const refresh = () => {
      listAudioDevices()
        .then(({ inputs, outputs }) => {
          setMicDevices(inputs);
          setOutputDevices(outputs);
        })
        .catch(() => {});
    };
    refresh();
    try {
      navigator.mediaDevices?.addEventListener("devicechange", refresh);
    } catch {}
    return () => {
      try {
        window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
      } catch {}
      try {
        navigator.mediaDevices?.removeEventListener("devicechange", refresh);
      } catch {}
      if (levelRaf.current != null) cancelAnimationFrame(levelRaf.current);
      try {
        levelCtx.current?.close();
      } catch {}
    };
  }, []);

  const preview = useMemo<BankQuestion[]>(
    () => (selectedRole ? (BANK.roles[selectedRole] ?? []).slice(0, 2) : []),
    [selectedRole],
  );

  const stopLevelMeter = () => {
    if (levelRaf.current != null) {
      cancelAnimationFrame(levelRaf.current);
      levelRaf.current = null;
    }
    try {
      levelCtx.current?.close();
    } catch {}
    levelCtx.current = null;
    setMicLevel(0);
  };

  const startLevelMeter = (stream: MediaStream) => {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      levelCtx.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i++) {
          const v = Math.abs((data[i]! - 128) / 128);
          if (v > peak) peak = v;
        }
        setMicLevel(Math.round(Math.min(1, peak * 1.6) * 100));
        levelRaf.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {}
  };

  const handleMicTest = async () => {
    setTesting(true);
    setMicError(null);
    stopLevelMeter();
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(window.isSecureContext ? "mic_unsupported" : "insecure_context");
      }
      const stream = await requestMicStream(micDeviceId || undefined);
      // Labels only populate after permission — refresh the pickers with real names.
      listAudioDevices()
        .then(({ inputs, outputs }) => {
          setMicDevices(inputs);
          setOutputDevices(outputs);
          const track = stream.getAudioTracks()[0];
          const realId = track?.getSettings()?.deviceId;
          if (realId && !micDeviceId) {
            setMicDeviceId(realId);
            storeDevice(MIC_DEVICE_KEY, realId);
          }
        })
        .catch(() => {});
      setMicOk(true);
      startLevelMeter(stream);
      // Keep the level meter alive briefly so the user sees their mic is live, then release.
      setTimeout(() => {
        stream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
        });
        stopLevelMeter();
        setTesting(false);
      }, 3500);
      return;
    } catch (e) {
      const err = e as { name?: string; message?: string };
      setMicOk(false);
      if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
        setMicError("Microphone permission was denied. Allow access in the browser address-bar icon, then test again.");
      } else if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") {
        if (micDeviceId) {
          // Stored device unplugged — forget it and retry the default once.
          setMicDeviceId("");
          storeDevice(MIC_DEVICE_KEY, "");
        }
        setMicError("No microphone found for that choice. Plug one in or pick the default, then test again.");
      } else if (err?.message === "insecure_context") {
        setMicError("Microphone capture needs HTTPS or localhost. Open the deployed https:// URL instead of plain http.");
      } else {
        setMicError("Microphone unavailable. Check the OS privacy setting for this browser, then test again.");
      }
      setTesting(false);
    }
  };

  const handleSpeakerTest = async () => {
    setSpeakerState({ testing: true, error: null, ok: null });
    try {
      if (!ttsAvailable) {
        // No speechSynthesis — at least prove the output path with a tone.
        await playTestTone(outputDeviceId || undefined);
        setSpeakerState({ testing: false, error: "This browser has no speech synthesis, so questions appear as text. Tone played instead.", ok: false });
        return;
      }
      const speaker = createSpeaker({ voiceURI: voiceURI || null });
      await speaker.speak("This is your interviewer voice. If you can hear this, voice output works.");
      await playTestTone(outputDeviceId || undefined).catch(() => {});
      setSpeakerState({ testing: false, error: null, ok: true });
    } catch {
      setSpeakerState({ testing: false, error: "Speaker test failed. Check the system volume and the selected output.", ok: false });
    }
  };

  const handleTranscriptionTest = async () => {
    setTx({ status: "checking", latencyMs: null, reason: null });
    const result = await probeTranscription();
    if (result.ok) setTx({ status: "ok", latencyMs: result.latencyMs, reason: null });
    else setTx({ status: "bad", latencyMs: result.latencyMs, reason: result.reason });
  };

  const toggle = (which: Expanded) => setExpanded((cur) => (cur === which ? null : which));

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
          <section className="mk-card" aria-label="Pre-flight checks">
            <div className="mk-card__head">
              <span className="mk-card__title">Pre-flight</span>
              <HelpPopover
                label="Help: pre-flight checks"
                title="Pre-flight — avoid the dead-mic moment"
                body="Click each row to open its settings. Microphone requests real capture with a live level, Voice output plays a real sample, Transcription pings the token endpoint. Green means that check passed just now."
              />
            </div>

            <button
              type="button"
              className="mk-check"
              data-state={micOk === true ? "ok" : micOk === false ? "bad" : "idle"}
              onClick={() => toggle("mic")}
              aria-expanded={expanded === "mic"}
              aria-label="Microphone settings"
              style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
            >
              <span className="mk-check__dot" />
              <span className="mk-check__icon"><Mic size={15} aria-hidden="true" /></span>
              <span className="mk-check__label">Microphone</span>
              <span className="mk-check__value">
                {micOk === true && "Microphone ready"}
                {micOk === false && "Microphone unavailable"}
                {micOk === null && "Not checked"}
              </span>
            </button>
            {expanded === "mic" && (
              <div className="mk-stack mk-stack--tight" style={{ marginTop: "var(--mk-sp-3)" }}>
                <div className="mk-field">
                  <label className="mk-label" htmlFor="mic-select">
                    Input device
                  </label>
                  <select
                    id="mic-select"
                    className="mk-select mk-select--sm"
                    value={micDeviceId}
                    onChange={(e) => {
                      setMicDeviceId(e.target.value);
                      storeDevice(MIC_DEVICE_KEY, e.target.value);
                      setMicOk(null);
                    }}
                  >
                    <option value="">Default microphone</option>
                    {micDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <p className="mk-footnote">
                    Pick the mic from your laptop (built-in, headset, USB). Used for the test below and for the call.
                  </p>
                </div>
                {(testing || micLevel > 0) && (
                  <div aria-label="Microphone level" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--mk-primary-soft)", overflow: "hidden" }}>
                      <div style={{ width: `${micLevel}%`, height: "100%", background: "var(--mk-primary-bright)", transition: "width 80ms linear" }} />
                    </div>
                    <span className="mk-mono" style={{ minWidth: 36 }}>{micLevel}%</span>
                  </div>
                )}
                {micError && (
                  <div role="alert" className="mk-chip mk-chip--rose" style={{ marginTop: "var(--mk-sp-2)" }}>
                    {micError}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              className="mk-check"
              data-state={speakerState.ok === true ? "ok" : ttsAvailable ? "ok" : "warn"}
              onClick={() => toggle("speaker")}
              aria-expanded={expanded === "speaker"}
              aria-label="Speaker settings"
              style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
            >
              <span className="mk-check__dot" />
              <span className="mk-check__icon"><Volume2 size={15} aria-hidden="true" /></span>
              <span className="mk-check__label">Voice output</span>
              <span className="mk-check__value">
                {speakerState.ok === true ? "Speaker ready" : ttsAvailable ? "Browser speech ready" : "Text only"}
              </span>
            </button>
            {expanded === "speaker" && (
              <div className="mk-stack mk-stack--tight" style={{ marginTop: "var(--mk-sp-3)" }}>
                <div className="mk-field">
                  <label className="mk-label" htmlFor="voice-select">
                    Interviewer voice
                  </label>
                  <select
                    id="voice-select"
                    className="mk-select mk-select--sm"
                    value={voiceURI}
                    onChange={(e) => {
                      setVoiceURI(e.target.value);
                      storeDevice(VOICE_URI_KEY, e.target.value);
                      setSpeakerState({ testing: false, error: null, ok: null });
                    }}
                  >
                    <option value="">Auto (best English)</option>
                    {voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} — {v.lang}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mk-field">
                  <label className="mk-label" htmlFor="output-select">
                    Output device
                  </label>
                  {supportsOutputSelection() ? (
                    <select
                      id="output-select"
                      className="mk-select mk-select--sm"
                      value={outputDeviceId}
                      onChange={(e) => {
                        setOutputDeviceId(e.target.value);
                        storeDevice(OUTPUT_DEVICE_KEY, e.target.value);
                      }}
                    >
                      <option value="">System default speaker</option>
                      {outputDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="mk-footnote">
                      This browser plays the interviewer through the system default speaker (output selection is not
                      supported here). Change it in the OS sound settings.
                    </p>
                  )}
                  <p className="mk-footnote">
                    Note: browser speech follows the system output; the test tone below follows your output choice.
                  </p>
                </div>
                {speakerState.error && (
                  <div role="alert" className="mk-chip mk-chip--amber" style={{ marginTop: "var(--mk-sp-2)" }}>
                    {speakerState.error}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              className="mk-check"
              data-state={tx.status === "ok" ? "ok" : tx.status === "bad" ? "bad" : "idle"}
              onClick={() => toggle("transcription")}
              aria-expanded={expanded === "transcription"}
              aria-label="Transcription settings"
              style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
            >
              <span className="mk-check__dot" />
              <span className="mk-check__icon"><AudioLines size={15} aria-hidden="true" /></span>
              <span className="mk-check__label">Transcription</span>
              <span className="mk-check__value">
                {tx.status === "ok" && `AssemblyAI reachable${tx.latencyMs != null ? ` (${tx.latencyMs} ms)` : ""}`}
                {tx.status === "bad" && "Unavailable — sim fallback"}
                {tx.status === "checking" && "Checking…"}
                {tx.status === "idle" && "Not checked"}
              </span>
            </button>
            {expanded === "transcription" && (
              <div className="mk-stack mk-stack--tight" style={{ marginTop: "var(--mk-sp-3)" }}>
                <p className="mk-footnote">
                  Live transcription needs the server token endpoint. If it fails, the call still runs in simulation
                  mode with a golden replay — the banner will say so.
                </p>
                {tx.reason && (
                  <div role="alert" className="mk-chip mk-chip--amber">
                    {tx.reason}
                  </div>
                )}
              </div>
            )}

            <div className="mk-btn-row" style={{ marginTop: "var(--mk-sp-4)", flexWrap: "wrap" }}>
              <span className="mk-row" style={{ gap: "var(--mk-sp-2)" }}>
                <button className="mk-btn mk-btn--sm" onClick={handleMicTest} disabled={testing}>
                  <Mic size={14} aria-hidden="true" />
                  Test microphone
                </button>
                <HelpPopover
                  label="Help: Test microphone"
                  title="Test microphone"
                  body="Requests the selected mic, shows a live input level for a few seconds, then releases it. Green dot = ready. If it fails, the message tells you whether it was permission, no device, or an insecure page."
                />
              </span>
              <button className="mk-btn mk-btn--sm mk-btn--ghost" onClick={() => void handleSpeakerTest()} disabled={speakerState.testing}>
                <Volume2 size={14} aria-hidden="true" />
                Test speaker
              </button>
              <button className="mk-btn mk-btn--sm mk-btn--ghost" onClick={() => void handleTranscriptionTest()} disabled={tx.status === "checking"}>
                <AudioLines size={14} aria-hidden="true" />
                Test transcription
              </button>
            </div>

            {testing && (
              <div style={{ marginTop: "var(--mk-sp-3)" }}>
                <WorkingIndicator
                  title="Checking your microphone"
                  caption="Waiting for your browser's permission prompt. Speak to see the level move."
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

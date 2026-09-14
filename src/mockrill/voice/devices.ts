// Real pre-flight device helpers. Previously the Setup screen probed nothing:
// mic test was a bare getUserMedia without device choice or level feedback, voice
// output was "speechSynthesis in window", and transcription was a hard-coded label.
// This module gives each row a real check backed by browser APIs.

export type AudioDevice = { deviceId: string; label: string; kind: "audioinput" | "audiooutput" };

export function mediaSupport(): { hasMediaDevices: boolean; secure: boolean; reason: string | null } {
  if (typeof window === "undefined" || !("mediaDevices" in navigator) || !navigator.mediaDevices) {
    const secure = typeof window !== "undefined" ? window.isSecureContext : false;
    if (!secure) return { hasMediaDevices: false, secure: false, reason: "insecure_context" };
    return { hasMediaDevices: false, secure, reason: "media_devices_unsupported" };
  }
  const secure = window.isSecureContext;
  if (!secure) return { hasMediaDevices: true, secure: false, reason: "insecure_context" };
  return { hasMediaDevices: true, secure: true, reason: null };
}

export async function listAudioDevices(): Promise<{ inputs: AudioDevice[]; outputs: AudioDevice[] }> {
  if (typeof window === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return { inputs: [], outputs: [] };
  }
  const all = await navigator.mediaDevices.enumerateDevices();
  const inputs = all
    .filter((d) => d.kind === "audioinput")
    .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}`, kind: "audioinput" as const }));
  const outputs = all
    .filter((d) => d.kind === "audiooutput")
    .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Speaker ${i + 1}`, kind: "audiooutput" as const }));
  return { inputs, outputs };
}

/** Request mic permission (optionally for a specific device) so labels populate and pre-flight is real. */
export async function requestMicStream(deviceId?: string): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("mic_unsupported");
  const audio: MediaTrackConstraints = { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true };
  if (deviceId) audio.deviceId = { exact: deviceId };
  return navigator.mediaDevices.getUserMedia({ audio });
}

export function supportsOutputSelection(): boolean {
  if (typeof window === "undefined") return false;
  const el = document.createElement("audio");
  return typeof (el as unknown as { setSinkId?: unknown }).setSinkId === "function";
}

export async function setAudioOutputDevice(el: HTMLAudioElement, deviceId: string): Promise<void> {
  const withSink = el as unknown as { setSinkId?: (id: string) => Promise<void> };
  if (typeof withSink.setSinkId !== "function") throw new Error("output_selection_unsupported");
  await withSink.setSinkId(deviceId);
}

/** Short audible blip through the default (or selected) output, for the speaker test. */
export async function playTestTone(outputDeviceId?: string): Promise<void> {
  // Generate a 440ms 660Hz sine as WAV and play it through an <audio> so setSinkId applies.
  const sampleRate = 22050;
  const len = Math.floor(sampleRate * 0.44);
  const buf = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const env = Math.min(1, i / (sampleRate * 0.02), (len - i) / (sampleRate * 0.05));
    buf[i] = Math.round(Math.sin(2 * Math.PI * 660 * t) * 0x4fff * Math.max(0, env));
  }
  const wav = encodeWav(buf, sampleRate);
  const url = URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
  try {
    const audio = new Audio(url);
    if (outputDeviceId) await setAudioOutputDevice(audio, outputDeviceId).catch(() => {});
    await audio.play();
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      audio.onended = done;
      setTimeout(done, 1200);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function encodeWav(pcm: Int16Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) view.setInt16(44 + i * 2, pcm[i]!, true);
  return buffer;
}

export type TranscriptionProbe =
  | { ok: true; latencyMs: number }
  | { ok: false; latencyMs: number; reason: string };

/** Real transcription check: can the browser mint a short-lived AssemblyAI token? */
export async function probeTranscription(tokenUrl = "/api/aai-token"): Promise<TranscriptionProbe> {
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  try {
    const resp = await fetch(tokenUrl, { headers: { "Cache-Control": "no-store" } });
    const latencyMs = Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - start);
    if (resp.ok) return { ok: true, latencyMs };
    let reason = `token_endpoint_${resp.status}`;
    try {
      const body = (await resp.json()) as { reason?: string };
      if (body?.reason) reason = body.reason;
    } catch {}
    return { ok: false, latencyMs, reason };
  } catch (e) {
    const latencyMs = Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - start);
    return { ok: false, latencyMs, reason: `token_endpoint_unreachable: ${String(e)}` };
  }
}

/** Unlock audio on a real user gesture so the first interviewer line is audible. */
export function unlockAudioOnGesture(): void {
  if (typeof window === "undefined") return;
  try {
    const synth = (window as unknown as { speechSynthesis?: SpeechSynthesis }).speechSynthesis;
    if (synth) {
      // Speaking (then cancelling) an empty utterance inside the click handler counts as
      // user activation on browsers that gate speechSynthesis behind a gesture.
      try {
        synth.cancel();
        const Ctor = (window as unknown as { SpeechSynthesisUtterance?: new (t: string) => SpeechSynthesisUtterance })
          .SpeechSynthesisUtterance;
        if (Ctor) {
          const u = new Ctor(" ");
          u.volume = 0;
          synth.speak(u);
          synth.cancel();
        }
      } catch {}
      // Kick the async voice list so speak() later finds a real voice instead of resolving silently.
      try {
        synth.getVoices();
      } catch {}
    }
  } catch {}
  try {
    const AC = (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
    if (AC) {
      const ctx = new AC();
      if (ctx.state === "suspended") void ctx.resume().catch(() => {});
      // Close the throwaway context; the real capture context is created afterwards.
      setTimeout(() => ctx.close().catch(() => {}), 1000);
    }
  } catch {}
}

export const MIC_DEVICE_KEY = "mockrill:micDeviceId";
export const OUTPUT_DEVICE_KEY = "mockrill:outputDeviceId";
export const VOICE_URI_KEY = "mockrill:voiceURI";

export function storedDevice(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function storeDevice(key: string, value: string): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {}
}

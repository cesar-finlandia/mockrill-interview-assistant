// DP-TURNTAKING M21 — browser TTS via window.speechSynthesis; no vendor SDK

export type Speaker = {
  speak(text: string): Promise<void>;
  cancel(): void;
  readonly speaking: boolean;
  readonly available: boolean;
};

const VOICE_WAIT_MS = 1500;
const WATCHDOG_MS = 30000;

export function createSpeaker(): Speaker {
  const available = typeof window !== "undefined" && "speechSynthesis" in window;
  let speaking = false;
  let pendingResolve: (() => void) | null = null;
  let watchdog: ReturnType<typeof setTimeout> | null = null;
  let chosenVoice: SpeechSynthesisVoice | null = null;

  function selectVoice(): SpeechSynthesisVoice | null {
    const voices = (window as unknown as { speechSynthesis: SpeechSynthesis }).speechSynthesis.getVoices() as SpeechSynthesisVoice[];
    if (voices.length === 0) return null;
    const google = voices.find((v) => v.lang.startsWith("en-") && v.name.includes("Google"));
    if (google) return google;
    const en = voices.find((v) => v.lang.startsWith("en-"));
    if (en) return en;
    return voices[0] ?? null;
  }

  if (available) {
    const initialVoices = (window as unknown as { speechSynthesis: SpeechSynthesis }).speechSynthesis.getVoices() as SpeechSynthesisVoice[];
    if (initialVoices.length > 0) {
      chosenVoice = selectVoice();
    } else {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let finished = false;
      const finishWithVoices = () => {
        if (finished) return;
        finished = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        chosenVoice = selectVoice();
      };
      const onVoicesChanged = () => {
        if (finished) return;
        finished = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        chosenVoice = selectVoice();
      };
      try {
        (window as unknown as { speechSynthesis: SpeechSynthesis }).speechSynthesis.addEventListener("voiceschanged", onVoicesChanged, { once: true } as AddEventListenerOptions);
      } catch {}
      timeoutId = setTimeout(() => {
        try {
          (window as unknown as { speechSynthesis: SpeechSynthesis }).speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
        } catch {}
        finishWithVoices();
      }, VOICE_WAIT_MS);
    }
  }

  // When available===false (SSR or browser without speechSynthesis), speak() resolves immediately.
  // The caller (turnController) MUST render the text on screen instead — check speaker.available before relying on audio.

  function speak(text: string): Promise<void> {
    if (!available) return Promise.resolve();
    if (speaking) cancel();
    const UtteranceCtor = (globalThis as unknown as { SpeechSynthesisUtterance: new (t: string) => SpeechSynthesisUtterance }).SpeechSynthesisUtterance ?? (window as unknown as { SpeechSynthesisUtterance: new (t: string) => SpeechSynthesisUtterance }).SpeechSynthesisUtterance;
    const utterance = new UtteranceCtor(text);
    // slightly brisk, like a real screener
    // rate: 1.05, pitch: 1.0, volume: 1.0
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    if (chosenVoice !== null) {
      utterance.voice = chosenVoice;
      utterance.lang = chosenVoice.lang;
    }
    speaking = true;
    return new Promise<void>((resolve) => {
      pendingResolve = resolve;
      const done = () => {
        if (pendingResolve === null) return;
        speaking = false;
        if (watchdog) {
          clearTimeout(watchdog);
          watchdog = null;
        }
        utterance.onend = null;
        utterance.onerror = null;
        const r = pendingResolve;
        pendingResolve = null;
        r();
      };
      utterance.onend = () => done();
      utterance.onerror = () => done();
      watchdog = setTimeout(() => done(), WATCHDOG_MS);
      try {
        (window as unknown as { speechSynthesis: SpeechSynthesis }).speechSynthesis.speak(utterance);
      } catch {
        done();
      }
    });
  }

  function cancel(): void {
    if (!available) {
      if (pendingResolve !== null) {
        if (watchdog) {
          clearTimeout(watchdog);
          watchdog = null;
        }
        const r = pendingResolve;
        pendingResolve = null;
        r();
      }
      return;
    }
    try {
      (window as unknown as { speechSynthesis: SpeechSynthesis }).speechSynthesis.cancel();
    } catch {}
    if (pendingResolve !== null) {
      if (watchdog) {
        clearTimeout(watchdog);
        watchdog = null;
      }
      const r = pendingResolve;
      pendingResolve = null;
      r();
    }
    speaking = false;
  }

  return {
    get speaking() {
      return speaking;
    },
    get available() {
      return available;
    },
    speak,
    cancel,
  };
}

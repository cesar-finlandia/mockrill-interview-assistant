// DP-TURNTAKING M21 — browser TTS via window.speechSynthesis; no vendor SDK

export type Speaker = {
  speak(text: string): Promise<void>;
  cancel(): void;
  readonly speaking: boolean;
  /** speechSynthesis exists in this browser. */
  readonly available: boolean;
  /** A voice is actually installed, i.e. the question will be heard and not only read. */
  readonly audible: boolean;
  /** All installed voices (empty when unavailable). */
  listVoices(): SpeechSynthesisVoice[];
  /** Currently selected voice, if any. */
  currentVoice(): SpeechSynthesisVoice | null;
  /** Persist a voice choice by voiceURI; pass null to return to auto-select. */
  selectVoiceByUri(uri: string | null): void;
};

export function listSpeechVoices(): SpeechSynthesisVoice[] {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
    return (window as unknown as { speechSynthesis: SpeechSynthesis }).speechSynthesis.getVoices() ?? [];
  } catch {
    return [];
  }
}

export function storedVoiceUri(): string | null {
  try {
    return localStorage.getItem("mockrill:voiceURI");
  } catch {
    return null;
  }
}

const VOICE_WAIT_MS = 1500;
const WATCHDOG_MS = 30000;

export function createSpeaker(opts?: { voiceURI?: string | null }): Speaker {
  const available = typeof window !== "undefined" && "speechSynthesis" in window;
  let speaking = false;
  let pendingResolve: (() => void) | null = null;
  let watchdog: ReturnType<typeof setTimeout> | null = null;
  let chosenVoice: SpeechSynthesisVoice | null = null;

  function selectVoice(): SpeechSynthesisVoice | null {
    const voices = (window as unknown as { speechSynthesis: SpeechSynthesis }).speechSynthesis.getVoices() as SpeechSynthesisVoice[];
    if (voices.length === 0) return null;
    const wanted = opts?.voiceURI ?? storedVoiceUri();
    if (wanted) {
      const match = voices.find((v) => v.voiceURI === wanted);
      if (match) return match;
    }
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

  function voiceCount(): number {
    if (!available) return 0;
    try {
      return ((window as unknown as { speechSynthesis: SpeechSynthesis }).speechSynthesis.getVoices() ?? []).length;
    } catch {
      return 0;
    }
  }

  function speak(text: string): Promise<void> {
    if (!available) return Promise.resolve();
    // Re-resolve the voice at speak time: Chrome loads voices asynchronously, so the
    // voice list can be empty at page load and populated by the time the user starts
    // the call. Re-selecting here is what makes the first question audible.
    chosenVoice = selectVoice();
    // R-05: a machine with speechSynthesis but zero installed voices (headless Chromium,
    // some Linux desktops) accepts speak() and then never fires onend. Resolving straight
    // away keeps the session moving; the UI already shows the question as on-screen text.
    if (voiceCount() === 0) return Promise.resolve();
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
    get audible() {
      return voiceCount() > 0;
    },
    speak,
    cancel,
    listVoices() {
      return listSpeechVoices();
    },
    currentVoice() {
      return chosenVoice;
    },
    selectVoiceByUri(uri: string | null) {
      try {
        if (uri) localStorage.setItem("mockrill:voiceURI", uri);
        else localStorage.removeItem("mockrill:voiceURI");
      } catch {}
      try {
        chosenVoice = selectVoice();
      } catch {}
    },
  };
}

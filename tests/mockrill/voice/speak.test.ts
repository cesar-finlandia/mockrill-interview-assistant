import { describe, it, expect, vi } from "vitest";

class FakeUtterance {
  text: string;
  rate = 1;
  pitch = 1;
  volume = 1;
  voice: unknown = null;
  lang = "";
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(t: string) {
    this.text = t;
  }
}

const voices = [
  { name: "Google US English", lang: "en-US" },
  { name: "Other", lang: "en-GB" },
];

const fakeSynth: unknown = {
  getVoices: vi.fn(() => voices),
  speak: vi.fn((u: FakeUtterance) => setTimeout(() => u.onend?.(), 0)),
  cancel: vi.fn(),
  addEventListener: vi.fn((_ev: string, cb: () => void) => setTimeout(cb, 0)),
  removeEventListener: vi.fn(),
};

(globalThis as unknown as { window: unknown }).window = { speechSynthesis: fakeSynth };
(globalThis as unknown as { speechSynthesis: unknown }).speechSynthesis = fakeSynth;
(globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = FakeUtterance;

import { createSpeaker } from "src/mockrill/voice/speak.js";

describe("createSpeaker", () => {
  it("available and never-reject", async () => {
    const s = createSpeaker();
    expect(s.available).toBe(true);
    await expect(s.speak("hello")).resolves.toBeUndefined();
    // error path resolves not rejects
    const errorSynth = {
      getVoices: vi.fn(() => voices),
      speak: vi.fn((u: FakeUtterance) => setTimeout(() => u.onerror?.(), 0)),
      cancel: vi.fn(),
      addEventListener: vi.fn((_ev: string, cb: () => void) => setTimeout(cb, 0)),
      removeEventListener: vi.fn(),
    };
    (globalThis as unknown as { window: { speechSynthesis: unknown } }).window.speechSynthesis = errorSynth;
    (globalThis as unknown as { speechSynthesis: unknown }).speechSynthesis = errorSynth;
    const s2 = createSpeaker();
    await expect(s2.speak("error case")).resolves.toBeUndefined();
    s.cancel();
    expect(s.speaking).toBe(false);
  });
});

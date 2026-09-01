import { describe, it, expect } from "vitest";
import { buildStreamingUrl } from "src/mockrill/voice/streamingClient.js";
describe("buildStreamingUrl", () => {
  it("exact order", () => {
    const url = buildStreamingUrl("wss://streaming.assemblyai.com/v3/ws", "tok123", { speechModel: "universal-3-5-pro", keyterms: ["React","TypeScript"] });
    expect(url).toBe("wss://streaming.assemblyai.com/v3/ws?token=tok123&speech_model=universal-3-5-pro&sample_rate=16000&encoding=pcm_s16le&format_turns=true&end_of_turn_confidence_threshold=0.45&min_turn_silence=560&max_turn_silence=1536&vad_threshold=0.2&interruption_delay=300&mode=balanced&keyterms_prompt=React&keyterms_prompt=TypeScript");
  });
  it("no keyterms omits param", () => {
    const url = buildStreamingUrl("wss://streaming.assemblyai.com/v3/ws", "tok", {});
    expect(url).not.toContain("keyterms_prompt");
  });
});

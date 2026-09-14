// DP-AAI-STREAM owns this barrel; M21/M22 forwarded from DP-TURNTAKING — barrel work sequenced last
export { createMicSource } from "./mic.js";
export type { MicSource } from "./mic.js";
export { createStreamingClient, buildStreamingUrl, mapTurnToTranscriptTurn } from "./streamingClient.js";
export type { StreamingClient, StreamingClientOptions } from "./streamingClient.js";
// Forwarded — DP-TURNTAKING owns these files; this barrel only forwards.
// Consumers MUST import from "src/mockrill/voice" (barrel); deep imports from
// "src/mockrill/voice/mic" or "src/mockrill/voice/streamingClient" are forbidden outside voice/.
export { createSpeaker, listSpeechVoices, storedVoiceUri } from "./speak.js";
export type { Speaker } from "./speak.js";
export { createTurnController, MAX_QUESTIONS, BARGE_IN_MIN_WORDS, BARGE_IN_PEAK, MAX_SESSION_MS, THINKING_TIMEOUT_MS } from "./turnController.js";
export type { TurnController, TurnControllerDeps } from "./turnController.js";
export { createSimMicSource, createSimStreamingClient, simTurns, SIM_CHUNK_MS } from "./simSession.js";
export {
  listAudioDevices,
  requestMicStream,
  supportsOutputSelection,
  playTestTone,
  probeTranscription,
  unlockAudioOnGesture,
  MIC_DEVICE_KEY,
  OUTPUT_DEVICE_KEY,
  VOICE_URI_KEY,
} from "./devices.js";

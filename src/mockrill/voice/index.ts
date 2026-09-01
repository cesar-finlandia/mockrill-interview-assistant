// DP-AAI-STREAM owns this barrel; M21/M22 forwarded from DP-TURNTAKING — barrel work sequenced last
export { createMicSource } from "./mic.js";
export type { MicSource } from "./mic.js";
export { createStreamingClient, buildStreamingUrl, mapTurnToTranscriptTurn } from "./streamingClient.js";
export type { StreamingClient, StreamingClientOptions } from "./streamingClient.js";
// Forwarded — DP-TURNTAKING owns these files; this barrel only forwards
// Phase 1: speak.ts / turnController.ts not yet present (DP-TURNTAKING sequenced last).
// Phase 2 will uncomment the forwards below after DP-TURNTAKING lands; do NOT create those files here.
// Consumers MUST import from "src/mockrill/voice" (barrel); deep imports from "src/mockrill/voice/mic" or "src/mockrill/voice/streamingClient" are forbidden outside voice/.
// export { createSpeaker } from "./speak.js";
// export type { Speaker } from "./speak.js";
// export { createTurnController } from "./turnController.js";
// export type { TurnController, TurnControllerDeps } from "./turnController.js";

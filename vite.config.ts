// Requirement IDs: UI-03, UI-AC-02 | DP-B §6.3, §10.8 item 1
// Vite config for the Mockrill app (`npm run dev`, `npm run build`). Vitest keeps using
// vitest.config.ts (which takes priority when both exist); aliases here mirror it so
// components resolve identically in dev/build.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { browserNodeShims, devApiPlugin } from "./scripts/vite-dev-api.js";

const root = fileURLToPath(new URL(".", import.meta.url));

// Rung 4 of the fallback ladder: `npm run mock:publish` serves the canned envelope sequence
// on 8787 and the UI consumes it same-origin at /events/stream (?source=stream).
const eventsProxy = {
  "/events": {
    target: "http://localhost:8787",
    changeOrigin: true,
    // SSE must not be buffered by the proxy or the transcript never ticks.
    configure: (proxy: { on: (e: string, cb: (res: { headers: Record<string, string> }) => void) => void }) => {
      proxy.on("proxyRes", (proxyRes) => {
        proxyRes.headers["cache-control"] = "no-cache, no-transform";
        proxyRes.headers["x-accel-buffering"] = "no";
      });
    },
  },
};

export default defineConfig({
  plugins: [browserNodeShims(), devApiPlugin()],
  // The chassis reads a handful of env knobs (TRANSPORT, API_BASE, resilience overrides)
  // straight off process.env. In a browser bundle `process` does not exist, so an unguarded
  // read is a ReferenceError at the first withResilience call — i.e. on the live streaming
  // path. Defining it as an empty object makes every knob simply read as unset.
  define: {
    "process.env": "{}",
  },
  // Declared up front so the dep optimizer runs once at server start. Discovered late (ajv is
  // reached only through the chassis' runtime require shim), it re-optimizes mid-load and the
  // first page request dies with "504 Outdated Optimize Dep" — flaky for a human, fatal for a
  // headless test that does not retry the navigation.
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "ajv/dist/2020", "ajv-formats"],
  },
  resolve: {
    alias: {
      src: `${root}src`,
      engine: `${root}engine`,
      fixtures: `${root}fixtures`,
      examples: `${root}examples`,
    },
  },
  server: { proxy: eventsProxy },
  // `vite preview` serves the built bundle; README's offline demo points the browser there
  // with ?source=stream, so it needs the same proxy or /events/stream 404s.
  preview: { proxy: eventsProxy },
});

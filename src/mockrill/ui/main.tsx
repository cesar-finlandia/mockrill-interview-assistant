// /examples/ is git-ignored so entry must live under src/ to reach public GitHub repo (submission field 8)
// Must run before any chassis import that may validate an envelope.
import { installBrowserNodeCompat } from "./browserNodeCompat.js";

installBrowserNodeCompat();

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import { initMode } from "./theme/mode.js";

// Self-hosted variable fonts (Fontsource). Bundled rather than fetched from a CDN so the
// identity survives an offline demo and a blocked-font network — see visual identity plan §5.1.
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";

// Design system (design_documents/visual_identity_plan.md §11). Order matters:
// tokens → base → motion keyframes → components.
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/motion.css";
import "./styles/components.css";

// index.html stamps data-mode before first paint; this re-applies it through the same code
// path the toggle uses, so storage and the <meta theme-color> stay in sync.
initMode();

const rootEl = document.getElementById("root")!;
createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

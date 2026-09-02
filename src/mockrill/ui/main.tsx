// /examples/ is git-ignored so entry must live under src/ to reach public GitHub repo (submission field 8)
// Must run before any chassis import that may validate an envelope.
import { installBrowserNodeCompat } from "./browserNodeCompat.js";

installBrowserNodeCompat();

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";

const rootEl = document.getElementById("root")!;
createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

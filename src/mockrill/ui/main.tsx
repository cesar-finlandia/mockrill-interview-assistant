// /examples/ is git-ignored so entry must live under src/ to reach public GitHub repo (submission field 8)
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";

const rootEl = document.getElementById("root")!;
createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

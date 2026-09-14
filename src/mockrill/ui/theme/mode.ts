// Colour appearance (light/dark) — orthogonal to the chassis `data-theme` skin.
// See design_documents/visual_identity_plan.md §4.
//
// The attribute is stamped on <html> before first paint by the inline bootstrap in
// index.html; this module is the runtime half (toggle + persistence + theme-color).

export type Mode = "light" | "dark";

export const MODE_STORAGE_KEY = "mockrill:mode";

const THEME_COLOR: Record<Mode, string> = {
  light: "#f5f7fa",
  dark: "#090b10",
};

function doc(): Document | null {
  return typeof document === "undefined" ? null : document;
}

function stored(): Mode | null {
  try {
    const v = globalThis.localStorage?.getItem(MODE_STORAGE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    // Private mode / blocked storage: fall through to the system preference.
    return null;
  }
}

export function prefersDark(): boolean {
  return typeof globalThis.matchMedia === "function"
    ? globalThis.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
}

/** The mode currently applied to the document, falling back to the system preference. */
export function getMode(): Mode {
  const attr = doc()?.documentElement.getAttribute("data-mode");
  if (attr === "light" || attr === "dark") return attr;
  return stored() ?? (prefersDark() ? "dark" : "light");
}

export function setMode(mode: Mode): Mode {
  const d = doc();
  if (d) {
    d.documentElement.setAttribute("data-mode", mode);
    const meta = d.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLOR[mode]);
  }
  try {
    globalThis.localStorage?.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    /* storage unavailable — the attribute is still applied for this session */
  }
  return mode;
}

export function toggleMode(): Mode {
  return setMode(getMode() === "dark" ? "light" : "dark");
}

/** Idempotent bootstrap: honours a stored choice, else the OS preference. */
export function initMode(): Mode {
  return setMode(stored() ?? (prefersDark() ? "dark" : "light"));
}

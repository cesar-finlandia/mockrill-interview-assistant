// Requirement IDs: DEMODRIVE-02, GOV-RES-02, XCUT-08 | Owned by M14 step 2 (DP-D2b §3.2/§8.1)
// Click-sequence runtime-config types + RES-04-validated loader and config
// defaults. Domain-free (DEMODRIVE-REU-01): every selector/screen name enters
// at runtime via the JSON script — nothing here knows any event or product.
// Validation errors surface in the frozen { path, message, code } shape of
// contracts/validation-error.schema.json; this module never throws raw for
// malformed input (GOV-RES-01).

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "../../resilience/index.js";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "..", "..", "..");

export const DEMODRIVE_SCRIPT_SCHEMA_PATH = join(
  REPO_ROOT,
  "contracts",
  "demodrive-script.schema.json",
);
export const DEMODRIVE_CONFIG_SCHEMA_PATH = join(
  REPO_ROOT,
  "contracts",
  "demodrive-config.schema.json",
);
export const DEFAULT_DEMODRIVE_CONFIG_PATH = join(REPO_ROOT, "config", "demodrive.json");

/** Frozen error shape: contracts/validation-error.schema.json. */
export interface ScriptLoadError {
  path: string;
  message: string;
  code: string;
}

export type DemodriveScriptResult =
  | { ok: true; script: DemodriveScript }
  | { ok: false; errors: ScriptLoadError[] };

//#region Types mirroring contracts/demodrive-script.schema.json (DEMODRIVE-02)

export type DemodriveActionKind =
  | "navigate"
  | "click"
  | "fill"
  | "wait_for"
  | "screenshot"
  | "wait_ms";

export interface DemodriveAction {
  action: DemodriveActionKind;
  /** Playwright selector (role / testId / css); author-supplied, never hardcoded here. */
  selector?: string | null;
  /** Fill text, navigate URL/path, or wait_ms duration as string. */
  value?: string | null;
  timeout_ms?: number;
  assert_visible?: boolean;
}

export interface DemodriveStep {
  /** kebab-case; names the per-step output folder (DEMODRIVE-05). */
  id: string;
  description?: string;
  actions: DemodriveAction[];
  wait_after_ms?: number;
}

export interface DemodriveViewport {
  width?: number;
  height?: number;
  device_scale_factor?: number;
}

export interface DemodriveVideoOptions {
  enabled?: boolean;
  codec?: "vp9" | "vp8" | "h264";
  size?: { width?: number; height?: number };
}

export interface DemodriveDataSource {
  kind: "mock" | "cache";
  mock_script?: string | null;
  cache_key?: string | null;
}

export interface DemodriveScript {
  version: "1.0.0";
  base_url: string;
  viewport?: DemodriveViewport;
  video?: DemodriveVideoOptions;
  layout?: "single-focus" | "dashboard";
  theme?: string | null;
  data_source?: DemodriveDataSource;
  steps: DemodriveStep[];
}

//#endregion

//#region Config types + defaults (DP-D2b §8.1 — config/demodrive.json)

export interface DemodriveToolConfig {
  version: "1.0.0";
  browser?: { choice?: "playwright"; channel?: "chromium" };
  video?: {
    codec?: "vp9" | "vp8" | "h264";
    size?: { width?: number; height?: number };
    fps?: number;
  };
  viewport?: { width?: number; height?: number; deviceScaleFactor?: number };
  layout?: "single-focus" | "dashboard";
  output?: { root: string; timestamp_format?: string };
  timeouts?: {
    per_action_ms?: number;
    per_step_wait_after_ms?: number;
    preflight_ms?: number;
  };
}

/** §8.1 defaults — used verbatim when config/demodrive.json is absent or invalid. */
export const DEMODRIVE_CONFIG_DEFAULTS: DemodriveResolvedConfig = {
  version: "1.0.0",
  browser: { choice: "playwright", channel: "chromium" },
  video: { codec: "vp9", size: { width: 1280, height: 720 }, fps: 30 },
  viewport: { width: 1280, height: 720, deviceScaleFactor: 2 },
  layout: "single-focus",
  output: { root: "assets/demodrive", timestamp_format: "YYYYMMDD-HHmmss" },
  timeouts: { per_action_ms: 5000, per_step_wait_after_ms: 300, preflight_ms: 10000 },
};

//#endregion

//#region Loaders

function readJsonFile(filePath: string): { ok: true; data: unknown } | { ok: false; error: ScriptLoadError } {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (err) {
    return {
      ok: false,
      error: {
        path: "/",
        message: `unreadable: ${err instanceof Error ? err.message : String(err)}`,
        code: "io",
      },
    };
  }
  try {
    return { ok: true, data: JSON.parse(raw) as unknown };
  } catch (err) {
    return {
      ok: false,
      error: {
        path: "/",
        message: `not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
        code: "parse",
      },
    };
  }
}

/** DEMODRIVE-02 — load + RES-04-validate a click-sequence script.
 * Never throws raw: any failure returns `{ ok:false, errors:[{path,message,code}] }`.
 * `path` is the user-facing script path; `error.path` is a JSON Pointer into it. */
function normalizeDemodriveScript(data: unknown): unknown {
  if (typeof data !== "object" || data === null) return data;
  const obj = data as Record<string, unknown>;
  // DP-PITCH §5 A8 uses camelCase baseUrl; chassis uses base_url
  if (typeof obj["baseUrl"] === "string" && typeof obj["base_url"] !== "string") {
    obj["base_url"] = obj["baseUrl"];
  }
  // Also handle viewport/fullPage/fast aliases
  if (obj["fullPage"] !== undefined && obj["full_page"] === undefined) obj["full_page"] = obj["fullPage"];
  // Translate flat steps (handout A8: {action:"goto"|"click"|"wait"|"screenshot"}) into DemodriveStep[]
  if (Array.isArray(obj["steps"])) {
    const steps = obj["steps"] as unknown[];
    const needsTranslate = steps.length > 0 && typeof steps[0] === "object" && steps[0] !== null && "action" in (steps[0] as Record<string, unknown>) && !("actions" in (steps[0] as Record<string, unknown>));
    if (needsTranslate) {
      const flatSteps = steps as Array<Record<string, unknown>>;
      const translated: DemodriveStep[] = flatSteps.map((s, idx) => {
        const action = s["action"] as string;
        const selector = s["selector"] as string | undefined;
        const url = s["url"] as string | undefined;
        const ms = s["ms"] as number | undefined;
        const fullPage = s["fullPage"] as boolean | undefined;
        const note = s["note"] as string | undefined;
        let mappedAction: DemodriveAction;
        if (action === "goto" || action === "navigate") mappedAction = { action: "navigate", value: (url ?? "/"), timeout_ms: 5000 };
        else if (action === "click") mappedAction = { action: "click", selector: selector ?? null, timeout_ms: 5000, assert_visible: false };
        else if (action === "wait") mappedAction = { action: "wait_ms", value: String(ms ?? 1000) };
        else if (action === "screenshot") mappedAction = { action: "screenshot", selector: null };
        else mappedAction = { action: action as DemodriveActionKind, selector: selector ?? null, value: (url ?? (ms !== undefined ? String(ms) : undefined)) ?? null };
        return { id: `step-${String(idx + 1).padStart(2, "0")}`, description: (note as string) ?? undefined, actions: [mappedAction], wait_after_ms: ms !== undefined && action === "wait" ? undefined : 300 };
      });
      obj["steps"] = translated;
    }
  }
  // Ensure viewport device_scale_factor alias
  if (obj["viewport"] && typeof obj["viewport"] === "object") {
    const vp = obj["viewport"] as Record<string, unknown>;
    if (vp["device_scale_factor"] === undefined && vp["deviceScaleFactor"] !== undefined) vp["device_scale_factor"] = vp["deviceScaleFactor"];
  }
  return obj;
}

export function loadDemodriveScript(scriptPath: string): DemodriveScriptResult {
  const parsed = readJsonFile(scriptPath);
  if (!parsed.ok) return { ok: false, errors: [parsed.error] };
  const normalized = normalizeDemodriveScript(parsed.data);
  const schema = JSON.parse(readFileSync(DEMODRIVE_SCRIPT_SCHEMA_PATH, "utf8")) as object;
  const res = validate(schema, normalized);
  if (!res.valid) {
    return {
      ok: false,
      errors: res.errors.map((e) => ({
        path: scriptPath,
        message: `${e.path} ${e.message}`,
        code: e.code,
      })),
    };
  }
  return { ok: true, script: normalized as DemodriveScript };
}

/** Per-section shallow merge: config file values win, defaults fill the rest. */
function mergeSection<T extends object>(defaults: T, override: object | undefined): T {
  if (!override || typeof override !== "object") return defaults;
  const merged: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };
  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined) merged[key] = value;
  }
  return merged as T;
}

/** Fully-resolved demodrive tool config (every knob has a §8.1 value). */
export interface DemodriveResolvedConfig {
  version: "1.0.0";
  browser: { choice: "playwright"; channel: "chromium" };
  video: { codec: "vp9" | "vp8" | "h264"; size: { width?: number; height?: number }; fps: number };
  viewport: { width?: number; height?: number; deviceScaleFactor?: number };
  layout: "single-focus" | "dashboard";
  output: { root: string; timestamp_format: string };
  timeouts: { per_action_ms: number; per_step_wait_after_ms: number; preflight_ms: number };
}

/** DEMODRIVE-01..05 config resolution (DP-D2b §8.1). Reads config/demodrive.json
 * (or `configPath`), validates via RES-04 against contracts/demodrive-config.schema.json,
 * and merges over §8.1 defaults. Missing file → pure defaults; invalid → warn once and
 * fall back to defaults; never crash (GOV-RES-02). */
export function applyConfigDefaults(
  configPath: string = DEFAULT_DEMODRIVE_CONFIG_PATH,
): { config: DemodriveResolvedConfig; warned: string | null } {
  let partial: Partial<DemodriveToolConfig> | null = null;
  let warned: string | null = null;

  if (existsSync(configPath)) {
    const parsed = readJsonFile(configPath);
    if (!parsed.ok) {
      warned = `warn: demodrive config invalid at ${configPath}: ${parsed.error.message} — using defaults (GOV-RES-02)`;
    } else {
      const schema = JSON.parse(readFileSync(DEMODRIVE_CONFIG_SCHEMA_PATH, "utf8")) as object;
      const res = validate(schema, parsed.data);
      if (!res.valid) {
        const detail = res.errors.map((e) => `${e.path} ${e.message}`).join("; ");
        warned = `warn: demodrive config invalid at ${configPath}: ${detail} — using defaults (GOV-RES-02)`;
      } else {
        partial = parsed.data as Partial<DemodriveToolConfig>;
      }
    }
  }

  const d = DEMODRIVE_CONFIG_DEFAULTS;
  const config = {
    version: "1.0.0" as const,
    browser: mergeSection(d.browser!, partial?.browser),
    video: mergeSection(d.video!, partial?.video),
    viewport: mergeSection(d.viewport!, partial?.viewport),
    layout: partial?.layout ?? d.layout!,
    output: mergeSection(d.output!, partial?.output),
    timeouts: mergeSection(d.timeouts!, partial?.timeouts),
  };

  return { config, warned };
}

//#endregion

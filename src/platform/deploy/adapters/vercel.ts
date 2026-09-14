// Requirement IDs: DEP-01, DEP-02, DEP-03, DEP-04, DEP-REU-01 | DP-B §5.1–§5.3
// Vercel adapter — the ONLY file (with its sibling adapters) allowed to know
// about the `vercel` CLI. Wraps a single command to public URL:
//   vercel --prod --yes   (credentials from VERCEL_TOKEN/VERCEL_PROJECT_ID)
// Rollback: npx vercel rollback --project $VERCEL_PROJECT_ID --yes (DEP-03).
// No hardcoded tokens anywhere; failures propagate to runDeploy's fallback
// chain (GOV-RES-01 / DEP-RES-01).

export const providerId: string = "vercel";

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DeployResult } from "../types.js";

function runCapture(cmd: string[], label: string): string {
  // shell:true is required on win32 to resolve npx.cmd, but shell:true with an
  // args array triggers DEP0190. NODE_NO_WARNINGS silences the footer; the
  // command still runs through the shell exactly as before.
  const res = spawnSync(cmd[0] ?? "vercel", cmd.slice(1), {
    stdio: ["inherit", "pipe", "pipe"],
    shell: true,
    env: { ...process.env, FORCE_COLOR: "0", NODE_NO_WARNINGS: "1" },
    encoding: "utf8",
  });
  if (res.error) throw new Error(`${label}: could not spawn (${res.error.message})`);
  if ((res.status ?? 1) !== 0) throw new Error(`${label}: exit code ${res.status}`);
  const out = res.stdout;
  const errOut = typeof res.stderr === "string" ? res.stderr : "";
  const text = (typeof out === "string" ? out : "") + (errOut ? "\n" + errOut : "");
  // Still echo the tail so the Inspect/Production/Aliased lines stay visible.
  try {
    process.stdout.write(text.slice(-2000));
    process.stdout.write("\n");
  } catch {}
  return text;
}

/** Prefer the stable production alias; fall back to the per-deployment Production URL. */
function parseDeployedUrl(output: string): string {
  const aliased = output.match(/^\s*(?:▲\s*)?Aliased\s+(https:\/\/\S+)/m);
  if (aliased?.[1]) return aliased[1].trim();
  const prod = output.match(/^\s*Production\s+(https:\/\/\S+)/m);
  if (prod?.[1]) return prod[1].trim();
  return "";
}

/** Persist PUBLIC_URL to .env so `npm run deploy:verify` polls the right target. */
function persistPublicUrl(url: string): void {
  try {
    const envPath = join(process.cwd(), ".env");
    let text = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
    if (/^PUBLIC_URL=.*/m.test(text)) {
      text = text.replace(/^PUBLIC_URL=.*/m, `PUBLIC_URL=${url}`);
    } else {
      if (text.length > 0 && !text.endsWith("\n")) text += "\n";
      text += `PUBLIC_URL=${url}\n`;
    }
    writeFileSync(envPath, text);
  } catch {}
}

export async function deploy(): Promise<DeployResult> {
  const t0 = Date.now();
  console.log("[deploy:vercel] running single-command deploy → vercel --prod --yes");
  // Flow A of DP-B §5.1 — one command; git-push hook (Flow B) is equivalent.
  const output = runCapture(["npx", "--yes", "vercel", "--prod", "--yes"], "vercel --prod");
  const elapsedMs = Date.now() - t0;

  const url = parseDeployedUrl(output) || process.env.PUBLIC_URL || "";
  if (!url) {
    throw new Error(
      "deploy finished but no URL could be parsed from the CLI output and PUBLIC_URL is unset — " +
        "set PUBLIC_URL in .env to the printed production URL so deploy:verify can poll /health",
    );
  }
  persistPublicUrl(url);
  console.log(`[deploy:vercel] public URL: ${url} (${elapsedMs}ms)`);
  return { url, provider: "vercel", elapsedMs };
}

/** DEP-03 — instant rollback to last successful deployment. */
export async function rollback(): Promise<void> {
  const project = process.env.VERCEL_PROJECT_ID ?? "";
  const args = ["--yes"];
  if (project) args.push("--project", project);
  console.log("[deploy:vercel] rolling back via npx vercel rollback");
  runCapture(["npx", "--yes", "vercel", "rollback", ...args], "vercel rollback");
}

// Requirement IDs: DEP-04, DEP-AC-01, DEP-RES-01 | DP-B §5.4 — smoke measurer.
//
// DEP-04 budget (fixed by M02, master_blueprint.md §6.5): push → smoke-testable
//   p50 ≤ 3 min, p95 ≤ 6 min. This script measures the post-deploy leg: it
//   polls GET $PUBLIC_URL/health every 2 s up to 30 s and exits 0 with the
//   elapsed wall-clock on the first 200, else throws SMOKE FAIL after <elapsed>ms.
//
// Run: node scripts/smoke-deploy.ts   (npm script: `deploy:verify`)
// Env: PUBLIC_URL (default http://localhost:3000), optional SMOKE_TIMEOUT_MS.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

function loadDotEnv(): void {
  // NOTE: vite.config.ts sets define {"process.env": "{}"} for the BROWSER
  // bundle — but vite-node externalizes this script to real Node, so
  // process.env here is the real environment. Do NOT cache it in a module
  // const; read lazily via baseUrl() below.
  try {
    // import.meta.url under vite-node resolves to /scripts/smoke-deploy.ts
    // (virtual path) — but process.cwd() is the repo root when run via
    // `npm run deploy:verify`, so prefer cwd and fall back to the URL dir.
    const candidates = [join(process.cwd(), ".env")];
    try {
      candidates.push(join(dirname(fileURLToPath(import.meta.url)), "..", ".env"));
    } catch {}
    for (const envPath of candidates) {
      if (!existsSync(envPath)) continue;
      const text = readFileSync(envPath, "utf8");
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim();
        if (!(key in process.env)) process.env[key] = val;
      }
    }
  } catch {}
}

loadDotEnv();

const POLL_INTERVAL_MS = 2_000;
const POLL_BUDGET_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 30_000);
// NOTE: BASE_URL is read lazily inside main(), not at module top-level —
// otherwise it would freeze before loadDotEnv() runs under vite-node.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const t0 = Date.now();
  const base = process.env.PUBLIC_URL ?? "http://localhost:3000";
  console.log(`[smoke] polling GET ${base}/health every ${POLL_INTERVAL_MS}ms up to ${POLL_BUDGET_MS}ms`);
  for (let i = 0; Date.now() - t0 < POLL_BUDGET_MS; i++) {
    try {
      const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5_000) });
      if (res.ok) {
        const elapsed = Date.now() - t0;
        console.log(`PASS ${elapsed}ms (attempt ${i + 1}, status ${res.status})`);
        return;
      }
      console.log(`[smoke] attempt ${i + 1}: status ${res.status}`);
    } catch (err) {
      console.log(`[smoke] attempt ${i + 1}: ${(err as Error).message}`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  // DEP-RES-01 pointer: a failed smoke is not a dead end.
  throw new Error(
    `SMOKE FAIL after ${Date.now() - t0}ms — ${base}/health never returned 200. ` +
      `Fallback chain: docs/deployment.md §Fallback.`,
  );
}

try {
  await main();
} catch (err) {
  console.error(`[smoke] ${(err as Error).message}`);
  process.exitCode = 1;
}

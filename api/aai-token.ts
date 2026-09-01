// max_session_duration_seconds=1800 (30 min) caps billing; socket billing is on total open duration, auto-close 3h default.
// Credit-protection invariants: audio never proxies through serverless; raw key never in client/query/bundled file; no AssemblyAI SDK dependency; failures become DegradedResult never throw.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withResilience, isDegradedResult, makeDegradedResult } from "src/resilience";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // (1) Method guard — only GET allowed
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  // (2) Read server-only key — this file and api/turn.ts are the ONLY places that may read it; never echo key in response/logs
  const key = process.env.ASSEMBLYAI_API_KEY;

  // (3) Key missing → DegradedResult 503
  if (!key || key.trim() === "") {
    const dr = makeDegradedResult({ reason: "aai_key_missing", fallback_source: "none" });
    res.status(503).json(dr);
    return;
  }

  // (4) Wrap upstream token fetch with resilience
  // Credit-protection: max_session_duration_seconds=1800 caps socket lifetime; billing on total open duration, auto-close 3h default.
  // Invariant: audio never proxies through serverless (browser → AssemblyAI only); raw key never in client/query/bundled file; no AssemblyAI SDK.
  const fetchToken = withResilience(
    async () => {
      const resp = await fetch(
        "https://streaming.assemblyai.com/v3/token?expires_in_seconds=60&max_session_duration_seconds=1800",
        {
          method: "GET",
          headers: { Authorization: key },
        },
      );
      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`aai token ${resp.status}: ${body.slice(0, 500)}`);
      }
      const json = (await resp.json()) as { token: string; expires_in_seconds: number };
      if (typeof json.token !== "string" || typeof json.expires_in_seconds !== "number") {
        throw new Error("invalid token shape");
      }
      return json;
    },
    { timeout_ms: 15000, retries: 1, fallback_chain: { order: ["cache", "none"] as const } },
  );

  // (5) Await wrapper
  const result = await fetchToken();

  // (6) Degraded path → 503 verbatim
  if (isDegradedResult(result)) {
    res.status(503).json(result);
    return;
  }

  // (7) Success → 200 with no-store
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ token: result.token, expires_in_seconds: result.expires_in_seconds });
}

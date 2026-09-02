import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRequire } from "module";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  let version = "0.0.0";
  try {
    const require = createRequire(import.meta.url);
    const pkg = require("../package.json") as { version?: string };
    if (typeof pkg.version === "string" && pkg.version.trim() !== "") {
      version = pkg.version;
    }
  } catch {}
  if (typeof version !== "string" || version.trim() === "") {
    version = "0.0.0";
  }
  const rawCommit = process.env.VERCEL_GIT_COMMIT_SHA;
  const commit = typeof rawCommit === "string" && rawCommit.trim() !== "" ? rawCommit : "local";
  try {
    res.setHeader("Content-Type", "application/json");
    res.status(200).json({ ok: true, version, commit });
  } catch {
    res.status(500).json({ error: "internal" });
  }
}

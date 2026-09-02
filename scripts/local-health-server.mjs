import http from "node:http";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let version = "0.0.0";
try { const pkg = require("../package.json"); if (typeof pkg.version === "string" && pkg.version.trim()) version = pkg.version; } catch {}
const commit = process.env.VERCEL_GIT_COMMIT_SHA && process.env.VERCEL_GIT_COMMIT_SHA.trim() ? process.env.VERCEL_GIT_COMMIT_SHA : "local";
const port = Number(process.env.PORT ?? 3000);
const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  if (url.pathname === "/health" || url.pathname === "/api/health") {
    if (req.method !== "GET") {
      res.writeHead(405, { Allow: "GET", "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "method_not_allowed" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, version, commit }));
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});
server.listen(port, () => console.log(`[local-health] listening on http://localhost:${port}/health -> ${JSON.stringify({ ok: true, version, commit })}`));

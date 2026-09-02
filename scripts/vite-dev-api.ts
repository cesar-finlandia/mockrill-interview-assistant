// Serves the Vercel serverless functions in `api/` from the Vite dev server.
//
// Without this, `npm run dev` gives a UI whose three backend routes 404, so the only way to
// exercise /api/aai-token, /api/turn and /health before a deploy is to deploy — which is
// exactly backwards. The handlers are loaded through Vite's SSR pipeline so they run as the
// real TypeScript sources with the real `src/*` aliases, not a copy.
import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, Plugin, ViteDevServer } from "vite";

type Handler = (req: unknown, res: unknown) => Promise<void> | void;

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return undefined;
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** Minimal VercelResponse surface over a Node ServerResponse. */
function vercelResponse(res: ServerResponse) {
  let statusCode = 200;
  return {
    setHeader(name: string, value: string) {
      res.setHeader(name, value);
      return this;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      res.statusCode = statusCode;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(body));
    },
    send(body: string) {
      res.statusCode = statusCode;
      res.end(body);
    },
    end(body?: string) {
      res.statusCode = statusCode;
      res.end(body);
    },
  };
}

/**
 * `src/platform/transport` is a single barrel (NFR-09 forbids deep imports), and it pulls in
 * the publisher, which imports node:crypto and node:fs. The chassis is read-only, so the two
 * builtins are swapped for browser shims at resolve time — client-side only, so the same
 * barrel keeps using the real modules inside the dev API handlers and on Vercel.
 */
export function browserNodeShims(): Plugin {
  const shims: Record<string, string> = {
    "node:crypto": path.join(process.cwd(), "scripts/shims/node-crypto.js"),
    "node:fs": path.join(process.cwd(), "scripts/shims/node-fs.js"),
  };
  return {
    name: "mockrill-browser-node-shims",
    enforce: "pre",
    resolveId(source, _importer, options) {
      if (options?.ssr) return null;
      return shims[source] ?? null;
    },
  };
}

function apiMiddleware(loader: () => Promise<ViteDevServer>, root: string): Connect.NextHandleFunction {
  return (req, res, next) => {
        void (async () => {
          const url = new URL(req.url ?? "/", "http://localhost");
          // vercel.json rewrites /health -> /api/health in production; mirror it here so the
          // smoke target is the same string locally and deployed.
          const route = url.pathname === "/health" ? "/api/health" : url.pathname;
          if (!route.startsWith("/api/")) return next();

          const rel = `${route.slice(1)}.ts`;
          if (!fs.existsSync(path.join(root, rel))) return next();

          try {
            const loaderServer = await loader();
            const mod = (await loaderServer.ssrLoadModule(`/${rel}`)) as { default: Handler };
            const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req);
            const vercelReq = {
              method: req.method,
              headers: req.headers,
              url: req.url,
              query: Object.fromEntries(url.searchParams),
              body,
            };
            await mod.default(vercelReq, vercelResponse(res));
          } catch (e) {
            // NFR-02 in the dev harness too: a broken route answers, it does not hang.
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "dev_api_error", detail: String(e) }));
          }
        })();
  };
}

export function devApiPlugin(): Plugin {
  return {
    name: "mockrill-dev-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(apiMiddleware(async () => server, server.config.root));
    },
    // `vite preview` serves the built static bundle and nothing else, so without this the
    // three API routes 404 and the only faithful local rehearsal of the deployed app is a
    // deploy. A middleware-mode dev server is used purely as the TypeScript loader for the
    // same api/*.ts handlers Vercel will run.
    configurePreviewServer(server) {
      const root = server.config.root;
      let loading: Promise<ViteDevServer> | null = null;
      const loader = async () => {
        if (!loading) {
          const { createServer } = await import("vite");
          // A separate cacheDir matters: sharing node_modules/.vite with the dev server makes
          // the two optimizers overwrite each other's manifest, and the dev server then
          // answers its next request with "504 Outdated Optimize Dep".
          loading = createServer({
            root,
            cacheDir: path.join(root, "node_modules/.vite-preview-api"),
            server: { middlewareMode: true },
            appType: "custom",
            logLevel: "warn",
          });
        }
        return loading;
      };
      server.middlewares.use(apiMiddleware(loader, root));
    },
  };
}

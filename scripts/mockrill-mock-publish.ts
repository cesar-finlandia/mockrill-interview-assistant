// NOTE: scripts/mock-publish.ts referenced by the existing package.json does not exist — the dev-tooling module is excluded from assembly.manifest.json. This file replaces that dead reference; mock:publish was repointed to vite-node scripts/mockrill-mock-publish.ts.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createPublisher } from "src/platform/transport";
import { makeEnvelope } from "src/mockrill/contracts";

function printUsage(): void {
  console.log(`Usage: vite-node scripts/mockrill-mock-publish.ts [--fast] [--port <n>] [--fixture <path>] [--loop] [--help]
Options:
  --fast            replay back-to-back with no delays
  --port <n>        port to listen on (1-65535, default 8787)
  --fixture <path>  path to session-golden.json (default fixtures/mockrill/session-golden.json)
  --loop            replay indefinitely, waiting 2000ms between loops
  --help            print this help and exit 0`);
}

type Args = { port: number; fixture: string; fast: boolean; loop: boolean };

function parseArgs(argv: string[]): Args {
  let port = 8787;
  let fixture = "fixtures/mockrill/session-golden.json";
  let fast = false;
  let loop = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--fast") {
      fast = true;
    } else if (arg === "--loop") {
      loop = true;
    } else if (arg === "--help") {
      printUsage();
      process.exit(0);
    } else if (arg === "--port") {
      const val = argv[i + 1];
      if (val === undefined) {
        console.error("Usage: --port requires a value");
        printUsage();
        console.error("unknown flag: --port missing value");
        process.exit(2);
      }
      const n = Number(val);
      if (!Number.isInteger(n) || n < 1 || n > 65535) {
        console.error(`invalid --port value: ${val} (must be integer 1..65535)`);
        process.exit(2);
      }
      port = n;
      i++;
    } else if (arg === "--fixture") {
      const val = argv[i + 1];
      if (val === undefined) {
        console.error("Usage: --fixture requires a value");
        printUsage();
        process.exit(2);
      }
      fixture = val;
      i++;
    } else if (arg.startsWith("--")) {
      console.error(`unknown flag: ${arg}`);
      printUsage();
      process.exit(2);
    } else {
      console.error(`unknown flag: ${arg}`);
      printUsage();
      process.exit(2);
    }
  }
  return { port, fixture, fast, loop };
}

function loadFixture(fixturePath: string): { turns: unknown[]; actions: unknown[]; scorecard: unknown; raw: Record<string, unknown> } {
  const rawText = readFileSync(fixturePath, "utf8");
  const data = JSON.parse(rawText) as { turns: unknown[]; actions: unknown[]; scorecard: unknown };
  if (!Array.isArray(data.turns) || data.turns.length !== 4 || !Array.isArray(data.actions) || data.actions.length !== 5) {
    console.warn(`fixture warning: expected turns.length===4 && actions.length===5 but got turns=${Array.isArray(data.turns) ? data.turns.length : "?"} actions=${Array.isArray(data.actions) ? data.actions.length : "?"}`);
  }
  return { turns: data.turns, actions: data.actions, scorecard: data.scorecard, raw: data as unknown as Record<string, unknown> };
}

const args = parseArgs(process.argv.slice(2));
const port = args.port;
const fixturePath = args.fixture;
const fast = args.fast;
const loop = args.loop;

const fixtureData = loadFixture(fixturePath) as { turns: Array<Record<string, unknown>>; actions: Array<Record<string, unknown>>; scorecard: Record<string, unknown> };
const publisher = createPublisher("sse");

type ReplayStep = { stepId: string; status: "started" | "streaming" | "done" | "error"; payload: Record<string, unknown> };

function buildReplayPlan(traceId: string): ReplayStep[] {
  const turns = fixtureData.turns as unknown as Array<Record<string, unknown>>;
  const actions = fixtureData.actions as unknown as Array<Record<string, unknown>>;
  const scorecard = fixtureData.scorecard as Record<string, unknown>;
  const sessionId = (scorecard.session_id as string) ?? "golden-session-01";
  const duration = (scorecard.duration_ms as number) ?? 540000;
  const steps: ReplayStep[] = [];
  steps.push({ stepId: "session-start", status: "started", payload: { session_id: sessionId, role: "frontend", began_at: new Date().toISOString() } });
  steps.push({ stepId: "mic-capture", status: "started", payload: { sample_rate: 16000, muted: false } });
  for (let i = 0; i < 4; i++) {
    const turn = turns[i] as unknown as Record<string, unknown>;
    const score = (actions[i + 1] as Record<string, unknown> | undefined)?.score as unknown as Record<string, unknown> | null;
    const perQuestion = (scorecard.per_question as Array<Record<string, unknown>> | undefined)?.[i] as unknown as Record<string, unknown> | undefined;
    const resolvedScore = score ?? perQuestion ?? null;
    const actionForQuestion = actions[i + 1] as Record<string, unknown> | undefined;
    const question = (actionForQuestion?.question as Record<string, unknown> | null) ?? (actionForQuestion ? null : null);
    const spoken = (actionForQuestion?.say as string | undefined) ?? "";
    steps.push({ stepId: "transcript-final", status: "done", payload: { turn } });
    if (resolvedScore) {
      steps.push({ stepId: "answer-scored", status: "done", payload: { score: resolvedScore } });
    }
    if (question) {
      steps.push({ stepId: "question-asked", status: "done", payload: { question, spoken } });
    } else if (actionForQuestion) {
      // fallback when question missing but action exists: still emit question-asked with placeholder
      const fallbackQ = { id: `q${i + 2}`, text: spoken, competency: "behavioral", difficulty: 1, follow_ups: [], keyterms: [] };
      steps.push({ stepId: "question-asked", status: "done", payload: { question: fallbackQ, spoken } });
    }
  }
  steps.push({ stepId: "scorecard-ready", status: "done", payload: { scorecard } });
  steps.push({ stepId: "session-end", status: "done", payload: { session_id: sessionId, duration_ms: duration, reason: "complete" } });
  void traceId;
  return steps;
}

async function delay(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function replayForTrace(traceId: string, req: import("node:http").IncomingMessage): Promise<void> {
  const plan = buildReplayPlan(traceId);
  do {
    for (let idx = 0; idx < plan.length; idx++) {
      const step = plan[idx]!;
      // Validate via makeEnvelope then publish via publisher.publish
      const _envelope = makeEnvelope(step.stepId as never, step.status, step.payload as never, { traceId });
      void _envelope;
      await publisher.publish({ stepId: step.stepId, status: step.status, payload: step.payload, traceId, degraded: false });
      if (idx < plan.length - 1) {
        const gap = fast ? 0 : Math.min(1500, 800);
        await delay(gap);
      }
    }
    if (loop) {
      const waitMs = fast ? 0 : 2000;
      await delay(waitMs);
    }
  } while (loop && !req.destroyed);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  const pathname = url.pathname;
  if (req.method === "GET" && pathname === "/events/stream") {
    publisher.asSseStream(req, res);
    const traceId = randomUUID();
    // handle close no-op
    req.on("close", () => {});
    // replay asynchronously without blocking response
    void replayForTrace(traceId, req);
    return;
  }
  if (req.method === "GET" && pathname === "/events") {
    const snap = publisher.collect();
    const body = snap ?? { status: "complete", trace_id: "", events: [], degraded: false };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
    return;
  }
  if (req.method === "GET" && (pathname === "/health" || pathname === "/")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "mockrill-mock-publish", port, fixture: fixturePath }));
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

server.on("error", (err) => {
  console.error(err);
  process.exit(1);
});

server.listen(port, () => {
  console.log(`mockrill-mock-publish listening on http://localhost:${port} fixture=${fixturePath} ${fast ? "--fast" : "realtime"} ${loop ? "--loop" : ""}`);
});

function shutdown(signal: string): void {
  console.log(`received ${signal}, shutting down`);
  server.close(() => {
    void publisher.close().then(() => process.exit(0));
  });
  // fallback force exit if close hangs
  setTimeout(() => {
    void publisher.close().then(() => process.exit(0));
  }, 1000);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));



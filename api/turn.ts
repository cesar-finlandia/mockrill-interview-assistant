import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isDegradedResult } from "src/resilience";
import { callInterviewer } from "engine/agents/index.js";
import type { TurnRequest } from "src/mockrill/engine/types.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  void process.env.ASSEMBLYAI_API_KEY;

  const body: Record<string, unknown> = req.body as Record<string, unknown>;
  const contentLength = Number(req.headers["content-length"]);
  let bodySize = 0;
  try {
    bodySize = JSON.stringify(req.body).length;
  } catch {
    bodySize = 0;
  }
  const lastTurn = (body as { last_turn?: { words?: unknown[] } }).last_turn;
  if ((bodySize > 65536 || (!Number.isNaN(contentLength) && contentLength > 65536)) && lastTurn?.words) {
    lastTurn.words = lastTurn.words.slice(0, 400);
  }

  res.setHeader("Cache-Control", "no-store");

  const result = await callInterviewer(req.body as TurnRequest);

  if (isDegradedResult(result)) {
    res.status(200).json({ say: "Let's continue — could you elaborate on that?", question: null, score: null, done: false, degraded:true });
    return;
  }

  res.status(200).json(result);
}

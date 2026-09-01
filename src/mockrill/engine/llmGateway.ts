// SERVER-ONLY — do not import from browser; use POST /api/turn
import { withResilience, isDegradedResult, makeDegradedResult } from "src/resilience";
import type { DegradedResult } from "src/resilience";
import { MOCKRILL_TOOLS } from "./tools.js";
import type { Message } from "src/context";

export type GatewayRequest = { messages: Message[]; model?: string };
export type GatewayResponse = { content: string | null; tool_calls: Array<{ id: string; name: string; arguments: unknown }> | null; raw: unknown; model: string; degraded: boolean };

export async function chatCompletion(req: GatewayRequest): Promise<GatewayResponse | DegradedResult<GatewayResponse>> {
  const headers: Record<string, string> = {
    Authorization: process.env.ASSEMBLYAI_API_KEY ?? "",
    "Content-Type": "application/json",
  };

  const res = await withResilience(
    async () => {
      let model = req.model ?? process.env.MOCKRILL_LLM_MODEL ?? "claude-sonnet-4-6";
      let resp = await fetch("https://llm-gateway.assemblyai.com/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: req.messages,
          tools: MOCKRILL_TOOLS,
          tool_choice: "auto",
          max_tokens: 700,
        }),
      });
      if (!resp.ok || resp.status >= 400) {
        model = process.env.MOCKRILL_LLM_FALLBACK_MODEL ?? "qwen3.5-4b-32k-fast";
        resp = await fetch("https://llm-gateway.assemblyai.com/v1/chat/completions", {
          method: "POST",
          headers,
          body: JSON.stringify({
            model,
            messages: req.messages,
            tools: MOCKRILL_TOOLS,
            tool_choice: "auto",
            max_tokens: 700,
          }),
        });
        if (!resp.ok) throw new Error(`gateway ${resp.status}`);
      }
      const json = await resp.json();
      return json;
    },
    { timeout_ms: 15000, retries: 1, fallback_chain: { order: ["cache", "none"] } as unknown as { order: ("cache" | "none")[] } },
  )();

  if (isDegradedResult(res)) return res as DegradedResult<GatewayResponse>;

  const json = res as Record<string, unknown>;
  const choices = (json["choices"] as Array<Record<string, unknown>> | undefined) ?? null;
  const firstMessage = (choices?.[0]?.["message"] as Record<string, unknown> | undefined) ?? null;
  const rawToolCalls = (firstMessage?.["tool_calls"] as Array<Record<string, unknown>> | null | undefined) ?? null;
  const content = (firstMessage?.["content"] as string | null | undefined) ?? null;
  const modelUsed =
    ((json["model"] as string | undefined) ?? req.model ?? process.env.MOCKRILL_LLM_MODEL ?? "claude-sonnet-4-6");

  if (!rawToolCalls || rawToolCalls.length === 0) {
    return {
      content: content ?? null,
      tool_calls: null,
      raw: json,
      model: modelUsed,
      degraded: false,
    };
  }

  const mapped: Array<{ id: string; name: string; arguments: unknown }> = [];
  for (const tc of rawToolCalls) {
    const fn = (tc["function"] as Record<string, unknown> | undefined) ?? null;
    const argsStr = (fn?.["arguments"] as string | undefined) ?? "";
    const id = (tc["id"] as string | undefined) ?? "";
    const name = (fn?.["name"] as string | undefined) ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(argsStr);
    } catch (e) {
      return makeDegradedResult<GatewayResponse>({
        reason: "llm_tool_arguments_unparseable",
        fallback_source: "none",
        original_error: String(e),
      });
    }
    mapped.push({ id, name, arguments: parsed });
  }

  return {
    content: content ?? null,
    tool_calls: mapped,
    raw: json,
    model: modelUsed,
    degraded: false,
  };
}

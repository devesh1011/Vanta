// NEAR AI provider for Vercel AI SDK
// This creates a custom language model provider compatible with AI SDK
// NEAR AI follows the OpenAI API specification

import { createOpenAI } from "@ai-sdk/openai";

const NEAR_AI_ENDPOINT =
  process.env.NEAR_AI_ENDPOINT || "https://cloud-api.near.ai/v1";
const NEAR_AI_API_KEY = process.env.NEAR_AI_API_KEY;

interface NearAISettings {
  apiKey?: string;
  endpoint?: string;
}

/**
 * Fix tool call argument "restarts" from vLLM.
 *
 * vLLM sometimes streams tool call arguments in two phases:
 *   Phase 1 (partial): {"fromToken":"NEAR","amount":"0.1","toToken"
 *   Phase 2 (restart): {"fromToken":"NEAR","amount":"0.1"}
 *
 * The AI SDK concatenates ALL argument deltas, producing invalid JSON.
 * This function detects restarts (a new delta starting with '{' when we
 * already have accumulated data) and keeps only the content from the
 * last restart onwards.
 *
 * After computing the correct arguments per tool-call index, it rewrites
 * the first SSE event for that tool call to carry the full arguments and
 * blanks out subsequent argument deltas so the SDK receives clean input.
 */
function fixToolCallArguments(sseText: string): string {
  const lines = sseText.split("\n");

  // ── 1. Collect tool-call argument deltas per index ──────────────────
  interface ToolCallMeta {
    firstLineIdx: number;
    subsequentLineIdxs: number[];
    argDeltas: string[];
  }
  const toolCallMeta: Record<number, ToolCallMeta> = {};
  let hasToolCalls = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(line.slice(6));
    } catch {
      continue;
    }

    const toolCalls = (
      data as {
        choices?: {
          delta?: {
            tool_calls?: {
              index?: number;
              function?: { arguments?: string };
            }[];
          };
        }[];
      }
    ).choices?.[0]?.delta?.tool_calls;
    if (!toolCalls) continue;

    hasToolCalls = true;

    for (const tc of toolCalls) {
      const idx = tc.index ?? 0;
      if (!toolCallMeta[idx]) {
        toolCallMeta[idx] = {
          firstLineIdx: i,
          subsequentLineIdxs: [],
          argDeltas: [],
        };
      }
      if (tc.function?.arguments != null) {
        toolCallMeta[idx].argDeltas.push(tc.function.arguments);
      }
      if (i !== toolCallMeta[idx].firstLineIdx) {
        toolCallMeta[idx].subsequentLineIdxs.push(i);
      }
    }
  }

  if (!hasToolCalls) return sseText;

  // ── 2. Detect restarts and compute correct final args ───────────────
  let needsFix = false;
  const fixedArgs: Record<number, string> = {};

  for (const [idx, meta] of Object.entries(toolCallMeta)) {
    let accumulated = "";
    let restartCount = 0;

    for (const delta of meta.argDeltas) {
      const trimmed = delta.trimStart();
      if (trimmed.startsWith("{") && accumulated.length > 1) {
        // vLLM restarted the JSON — discard the old partial and begin fresh
        console.log(
          `🔧 NEAR AI FIX: Argument restart detected for tool call index ${idx}`,
        );
        console.log(
          `  Previous accumulated (${accumulated.length} chars): ${accumulated.slice(0, 120)}…`,
        );
        console.log(`  New restart: ${delta.slice(0, 120)}…`);
        accumulated = delta;
        restartCount++;
      } else {
        accumulated += delta;
      }
    }

    fixedArgs[Number(idx)] = accumulated;
    if (restartCount > 0) needsFix = true;
  }

  if (!needsFix) {
    // Nothing to fix — just log tool-call events for debugging
    for (const line of lines) {
      if (line.startsWith("data: ") && !line.includes("[DONE]")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.choices?.[0]?.delta?.tool_calls) {
            console.log(
              "🔵 NEAR AI SSE chunk (TOOL CALL):",
              JSON.stringify(data, null, 2),
            );
          }
        } catch {
          /* ignore */
        }
      }
    }
    return sseText;
  }

  // ── 3. Rewrite SSE events ───────────────────────────────────────────
  // Put the full correct arguments on the FIRST event for each tool call.
  // The SDK will see parsable JSON on the first delta and immediately
  // emit the tool-call, setting hasFinished=true and ignoring later deltas.
  // Blank out subsequent argument deltas for safety.
  for (const [idx, meta] of Object.entries(toolCallMeta)) {
    const toolIdx = Number(idx);

    // Rewrite first event
    try {
      const data = JSON.parse(lines[meta.firstLineIdx].slice(6));
      for (const tc of data.choices[0].delta.tool_calls) {
        if ((tc.index ?? 0) === toolIdx) {
          if (!tc.function) tc.function = {};
          tc.function.arguments = fixedArgs[toolIdx];
        }
      }
      lines[meta.firstLineIdx] = `data: ${JSON.stringify(data)}`;
      console.log(
        `🔧 NEAR AI FIX: Rewrote tool call ${toolIdx} args → ${fixedArgs[toolIdx].slice(0, 200)}`,
      );
    } catch (e) {
      console.error(
        `🔧 NEAR AI FIX: Failed to rewrite line ${meta.firstLineIdx}:`,
        e,
      );
    }

    // Blank out subsequent argument deltas
    for (const lineIdx of meta.subsequentLineIdxs) {
      try {
        const data = JSON.parse(lines[lineIdx].slice(6));
        for (const tc of data.choices?.[0]?.delta?.tool_calls ?? []) {
          if ((tc.index ?? 0) === toolIdx && tc.function?.arguments != null) {
            tc.function.arguments = "";
          }
        }
        lines[lineIdx] = `data: ${JSON.stringify(data)}`;
      } catch {
        /* leave line intact */
      }
    }
  }

  return lines.join("\n");
}

/**
 * Create a NEAR AI provider using OpenAI-compatible API
 * NEAR AI follows the OpenAI API specification, so we can use the OpenAI SDK
 */
export function createNearAI(settings: NearAISettings = {}) {
  const apiKey = settings.apiKey || NEAR_AI_API_KEY;
  const endpoint = settings.endpoint || NEAR_AI_ENDPOINT;

  if (!apiKey) {
    console.warn("NEAR AI API key is not configured");
  }

  /**
   * Custom fetch wrapper that:
   * 1. Logs requests/responses for debugging
   * 2. Fixes vLLM's malformed streaming tool-call argument deltas
   *
   * vLLM (used by NEAR AI) occasionally "restarts" the JSON arguments
   * mid-stream, producing two concatenated JSON fragments instead of one.
   * This wrapper reads the full SSE body, detects & fixes restarts, then
   * re-emits the corrected stream to the AI SDK.
   */
  const nearAiFetch: typeof fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    console.log("🔵 NEAR AI Request:", {
      url,
      method: init?.method,
      body: init?.body ? JSON.parse(init.body as string) : undefined,
    });

    const response = await fetch(input, init);
    const contentType = response.headers.get("content-type");

    // ── Non-streaming responses — log & pass through ──────────────────
    if (!contentType?.includes("text/event-stream") || !response.body) {
      try {
        const cloned = response.clone();
        const data = await cloned.json();
        console.log("🔵 NEAR AI Response:", JSON.stringify(data, null, 2));
      } catch (error) {
        console.error("🔵 NEAR AI Response parsing error:", error);
      }
      return response;
    }

    // ── Streaming responses — buffer, fix, re-emit ────────────────────
    console.log("🔵 NEAR AI Response: Streaming (SSE)");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    // biome-ignore lint/correctness/noConstantCondition: streaming read loop
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
    }
    fullText += decoder.decode(); // flush decoder

    // Apply the tool-call argument restart fix
    const fixedText = fixToolCallArguments(fullText);

    // Re-emit as a ReadableStream so the SDK can consume it normally
    const fixedBody = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(fixedText));
        controller.close();
      },
    });

    return new Response(fixedBody, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };

  // Create an OpenAI-compatible provider pointing to NEAR AI endpoint
  const openai = createOpenAI({
    apiKey: apiKey || "dummy-key",
    baseURL: endpoint,
    fetch: nearAiFetch,
  });

  // Return a function that creates chat models (not responses models)
  return (modelId: string) => openai.chat(modelId);
}

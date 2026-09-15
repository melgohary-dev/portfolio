import type { StreamEvent, Usage } from "../../types";
import { parseSse } from "./openai";
import type { ChatTurn, StreamRequest } from "./types";

interface GeminiChunk {
  candidates?: Array<{
    content?: { parts: Array<{ text?: string }> };
    finishReason?: string | null;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
  error?: { message?: string };
}

/**
 * Stream Google Gemini's `:streamGenerateContent` REST endpoint (SSE).
 * Uses the free-tier model ids like `gemini-2.5-flash`.
 */
export async function* geminiStream(
  config: { model: string; apiKey: string },
  prompt: string,
  history: ChatTurn[],
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const base =
    "https://generativelanguage.googleapis.com/v1beta/models";
  const url = `${base}/${encodeURIComponent(config.model)}:streamGenerateContent?alt=sse`;

  const contents = [
    ...history
      .filter((h) => h.content.trim().length > 0)
      .map((h) => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }],
      })),
    { role: "user", parts: [{ text: prompt }] },
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": config.apiKey,
    },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    }),
    signal,
  });

  if (!res.ok) {
    let detail: string;
    try {
      const body = await res.json();
      detail = (body?.error?.message ?? res.statusText).slice(0, 300);
    } catch {
      detail = res.statusText;
    }
    throw new Error(`Gemini ${res.status}: ${detail}`);
  }

  // Re-use the SSE parser from the OpenAI adapter (identical wire encoding).
  let accumulated = "";
  for await (const data of parseSse(res, signal)) {
    if (!data) continue;
    let chunk: GeminiChunk;
    try {
      chunk = JSON.parse(data);
    } catch {
      continue;
    }
    if (chunk.error?.message) throw new Error(chunk.error.message);
    const parts = chunk.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.text) {
        accumulated += part.text;
        yield { type: "token", value: part.text };
      }
    }
    const finish = chunk.candidates?.[0]?.finishReason;
    if (finish && finish !== "SAFETY") {
      let usage: Usage;
      if (chunk.usageMetadata) {
        usage = {
          inputTokens: chunk.usageMetadata.promptTokenCount ?? 0,
          outputTokens: chunk.usageMetadata.candidatesTokenCount ?? 0,
        };
      } else {
        usage = {
          inputTokens: prompt.trim().split(/\s+/).filter(Boolean).length,
          outputTokens: Math.max(
            accumulated.trim().split(/\s+/).filter(Boolean).length,
            1,
          ),
        };
      }
      yield { type: "done", usage };
      return;
    }
  }

  // Streaming ended without an explicit finish reason (e.g. output cap).
  yield {
    type: "done",
    usage: {
      inputTokens: prompt.trim().split(/\s+/).filter(Boolean).length,
      outputTokens: Math.max(
        accumulated.trim().split(/\s+/).filter(Boolean).length,
        1,
      ),
    },
  };
}

/** Adapter entry point for Google Gemini. */
export function geminiAdapter(config: { defaultModel: string }) {
  return (req: StreamRequest, key?: string): AsyncGenerator<StreamEvent> => {
    if (!key) throw new Error("Missing API key");
    return geminiStream(
      { model: config.defaultModel, apiKey: key },
      req.prompt,
      req.history,
      req.signal,
    );
  };
}

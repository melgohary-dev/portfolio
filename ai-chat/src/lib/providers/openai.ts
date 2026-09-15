import type { StreamEvent, Usage } from "../../types";
import type { ChatTurn, StreamRequest } from "./types";

/** Thrown when the fetch is aborted; maps to an AbortError for callers. */
function abortError(): Error {
  const err = new Error("Aborted");
  err.name = "AbortError";
  return err;
}

/**
 * Parse a fetch Response body as Server-Sent Events, yielding one event's data
 * payload per line that starts with "data:". Respects an AbortSignal between
 * chunks so cancellation bubbles up as an AbortError.
 */
export async function* parseSse(
  res: Response,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  if (!res.body) throw new Error("Response has no body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    if (signal?.aborted) throw abortError();
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("data:")) {
        const data = line.slice(5).trim();
        if (data) yield data;
      }
    }
  }
  if (buffer.trim().startsWith("data:")) {
    const data = buffer.trim().slice(5).trim();
    if (data) yield data;
  }
}

/** A single chat-completions SSE chunk. */
interface ChatChunk {
  choices?: Array<{
    delta?: { content?: string };
    finish_reason?: string | null;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

/**
 * Stream an OpenAI-compatible `/chat/completions` endpoint. Works for OpenAI,
 * OpenRouter, Groq, Together, Mistral, DeepSeek, Fireworks and many others,
 * since they all use the same streaming wire format.
 */
export async function* openAICompletionsStream(
  config: { baseUrl: string; model: string; apiKey: string },
  prompt: string,
  history: ChatTurn[],
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const res = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      stream: true,
      messages: [
        ...history.map((h) => ({ role: h.role, content: h.content })),
        { role: "user", content: prompt },
      ],
    }),
    signal,
  });

  if (!res.ok) {
    let detail: string;
    try {
      const body = await res.text();
      detail = (JSON.parse(body).error?.message ?? body).slice(0, 300);
    } catch {
      detail = res.statusText;
    }
    throw new Error(`API ${res.status}: ${detail}`);
  }

  let accumulated = "";
  let usage: Usage | null = null;

  for await (const data of parseSse(res, signal)) {
    if (data === "[DONE]") break;
    let chunk: ChatChunk;
    try {
      chunk = JSON.parse(data);
    } catch {
      continue;
    }
    if (chunk.error?.message) throw new Error(chunk.error.message);
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) {
      accumulated += delta;
      yield { type: "token", value: delta };
    }
    if (chunk.usage) {
      usage = {
        inputTokens: chunk.usage.prompt_tokens ?? 0,
        outputTokens: chunk.usage.completion_tokens ?? 0,
      };
    }
  }

  yield {
    type: "done",
    usage:
      usage ?? {
        inputTokens: prompt.trim().split(/\s+/).filter(Boolean).length,
        outputTokens: Math.max(accumulated.trim().split(/\s+/).filter(Boolean).length, 1),
      },
  };
}

/** Adapter entry point for OpenAI-compatible providers. */
export function openAiAdapter(config: {
  baseUrl: string;
  defaultModel: string;
}) {
  return (req: StreamRequest, key?: string): AsyncGenerator<StreamEvent> => {
    if (!key) throw new Error("Missing API key");
    return openAICompletionsStream(
      { baseUrl: config.baseUrl, model: config.defaultModel, apiKey: key },
      req.prompt,
      req.history,
      req.signal,
    );
  };
}

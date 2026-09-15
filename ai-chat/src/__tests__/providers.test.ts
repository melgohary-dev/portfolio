import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  PROVIDERS,
  PROVIDER_IDS,
  getApiKey,
  keyStatus,
  setApiKey,
  clearApiKeys,
  createProviderStream,
} from "../lib/providers";
import { parseSse, openAICompletionsStream, openAiAdapter } from "../lib/providers/openai";
import { geminiStream, geminiAdapter } from "../lib/providers/gemini";
import { mockStream } from "../lib/providers/mock";
import type { ChatTurn, StreamRequest } from "../lib/providers/types";

const encoder = new TextEncoder();

function sseBody(chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

function okResponse(chunks: string[]): Response {
  return { ok: true, status: 200, statusText: "OK", body: sseBody(chunks) } as unknown as Response;
}

async function collect(gen: AsyncGenerator<unknown>): Promise<unknown[]> {
  const out: unknown[] = [];
  for await (const value of gen) out.push(value);
  return out;
}

let ac: AbortController;
function makeReq(overrides: Partial<StreamRequest> = {}): StreamRequest {
  return { provider: "mock", prompt: "hi", history: [], signal: ac.signal, ...overrides };
}

describe("parseSse", () => {
  it("yields data payloads, splitting buffered lines across reads", async () => {
    const res = okResponse(["data: on", "e\n\n", "data: tw", "o\ndata: three"]);
    expect(await collect(parseSse(res))).toEqual(["one", "two", "three"]);
  });

  it("flushes an unterminated final data line", async () => {
    const res = okResponse(["data: tail"]);
    expect(await collect(parseSse(res))).toEqual(["tail"]);
  });

  it("skips empty data lines and non-data lines", async () => {
    const res = okResponse([
      ": keep-a-comment\n\ndata:\n\ndata:   \n\nnote\n\ndata: 42\n",
    ]);
    expect(await collect(parseSse(res))).toEqual(["42"]);
  });

  it("throws when the response has no body", async () => {
    const res = { ok: true, status: 200, body: null } as unknown as Response;
    await expect(collect(parseSse(res))).rejects.toThrow("Response has no body");
  });

  it("throws an AbortError when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const res = okResponse(["data: x\n"]);
    await expect(collect(parseSse(res, controller.signal))).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});

describe("openAICompletionsStream", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("posts the right request and emits tokens then done with usage", async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
      okResponse([
        'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n',
        'data: {"choices":[{"delta":{"content":" world"},"finish_reason":"stop"}],"usage":{"prompt_tokens":4,"completion_tokens":2}}\n',
        "data: [DONE]\n",
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const history: ChatTurn[] = [{ role: "user", content: "old question" }];
    const events = await collect(
      openAICompletionsStream(
        { baseUrl: "https://api.example.com/v1/", model: "demo-model", apiKey: "k" },
        "hello",
        history,
        ac.signal,
      ),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer k");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("demo-model");
    expect(body.stream).toBe(true);
    expect(body.messages).toEqual([
      { role: "user", content: "old question" },
      { role: "user", content: "hello" },
    ]);

    expect(events).toEqual([
      { type: "token", value: "Hello" },
      { type: "token", value: " world" },
      { type: "done", usage: { inputTokens: 4, outputTokens: 2 } },
    ]);
  });

  it("estimates usage when the stream omits it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        okResponse([
          'data: {"choices":[{"delta":{"content":"a b"}}]}\n',
          'data: {"choices":[{"delta":{"content":" c"},"finish_reason":"stop"}]}\n',
          "data: [DONE]\n",
        ]),
      ),
    );
    const events = await collect(
      openAICompletionsStream(
        { baseUrl: "https://api.example.com/v1", model: "m", apiKey: "k" },
        "one two",
        [],
        ac.signal,
      ),
    );
    const done = events[events.length - 1] as { type: string; usage: { inputTokens: number; outputTokens: number } };
    expect(done.usage.inputTokens).toBe(2);
    expect(done.usage.outputTokens).toBeGreaterThanOrEqual(1);
  });

  it("surfaces non-2xx responses with the parsed error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          text: async () => '{"error":{"message":"invalid api key"}}',
        }) as unknown as Response,
      ),
    );

    await expect(
      collect(
        openAICompletionsStream(
          { baseUrl: "https://api.example.com/v1", model: "m", apiKey: "k" },
          "hi",
          [],
          ac.signal,
        ),
      ),
    ).rejects.toThrow("API 401: invalid api key");
  });

  it("falls back to statusText when the error body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ({
          ok: false,
          status: 500,
          statusText: "Server Error",
          text: async () => "plain text",
        }) as unknown as Response,
      ),
    );

    await expect(
      collect(
        openAICompletionsStream(
          { baseUrl: "https://api.example.com/v1", model: "m", apiKey: "k" },
          "hi",
          [],
          ac.signal,
        ),
      ),
    ).rejects.toThrow("API 500: Server Error");
  });

  it("skips malformed JSON lines and throws on an error payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        okResponse([
          "data: not-json\n",
          'data: {"error":{"message":"quota exceeded"}}\n',
        ]),
      ),
    );

    await expect(
      collect(
        openAICompletionsStream(
          { baseUrl: "https://api.example.com/v1", model: "m", apiKey: "k" },
          "hi",
          [],
          ac.signal,
        ),
      ),
    ).rejects.toThrow("quota exceeded");
  });

  it("breaks on the [DONE] sentinel without further tokens", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        okResponse([
          'data: {"choices":[{"delta":{"content":"A"},"finish_reason":null}]}\n',
          "data: [DONE]\n",
          'data: {"choices":[{"delta":{"content":"should-not-appear"}}]}\n',
        ]),
      ),
    );

    const events = await collect(
      openAICompletionsStream(
        { baseUrl: "https://api.example.com/v1", model: "m", apiKey: "k" },
        "hi",
        [],
        ac.signal,
      ),
    );
    expect(events.filter((e) => (e as { type: string }).type === "token")).toHaveLength(1);
  });
});

describe("openAiAdapter", () => {
  it("throws when no key is supplied", async () => {
    const adapter = openAiAdapter({ baseUrl: "https://x/v1", defaultModel: "m" });
    expect(() => collect(adapter(makeReq()))).toThrow("Missing API key");
  });

  it("delegates with the configured model and the given key", async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
      okResponse(['data: {"choices":[{"delta":{"content":"ok"},"finish_reason":"stop"}]}\n', "data: [DONE]\n"]),
    );
    vi.stubGlobal("fetch", fetchMock);
    const adapter = openAiAdapter({ baseUrl: "https://x/v1", defaultModel: "cfg-model" });
    const events = await collect(adapter(makeReq({ provider: "openai" }), "key-xyz"));
    expect(events[0]).toEqual({ type: "token", value: "ok" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("https://x/v1/chat/completions");
    expect(JSON.parse(init.body as string).model).toBe("cfg-model");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer key-xyz");
  });
});

describe("geminiStream", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("maps history to native parts and streams tokens then done", async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
      okResponse([
        'data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}\n',
        'data: {"candidates":[{"content":{"parts":[{"text":" world"}]},"finishReason":"STOP"}],"usageMetadata":{"promptTokenCount":5,"candidatesTokenCount":2}}\n',
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const history: ChatTurn[] = [{ role: "assistant", content: "earlier reply" }];
    const events = await collect(
      geminiStream({ model: "gemini-2.5-flash", apiKey: "gk" }, "hi", history, ac.signal),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(
      "/models/gemini-2.5-flash:streamGenerateContent?alt=sse",
    );
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("gk");
    const body = JSON.parse(init.body as string);
    expect(body.contents).toEqual([
      { role: "model", parts: [{ text: "earlier reply" }] },
      { role: "user", parts: [{ text: "hi" }] },
    ]);
    expect(body.generationConfig.maxOutputTokens).toBe(4096);

    expect(events).toEqual([
      { type: "token", value: "Hello" },
      { type: "token", value: " world" },
      { type: "done", usage: { inputTokens: 5, outputTokens: 2 } },
    ]);
  });

  it("ignores SAFETY finish reasons and always closes with done", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        okResponse([
          'data: {"candidates":[{"content":{"parts":[{"text":"partial"}]},"finishReason":"SAFETY"}]}\n',
        ]),
      ),
    );
    const events = await collect(
      geminiStream({ model: "gemini-2.5-flash", apiKey: "gk" }, "hi", [], ac.signal),
    );
    expect(events[0]).toEqual({ type: "token", value: "partial" });
    expect(events[events.length - 1]).toMatchObject({ type: "done" });
  });

  it("estimates usage when usageMetadata is absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        okResponse([
          'data: {"candidates":[{"content":{"parts":[{"text":"ok"}]},"finishReason":"STOP"}]}\n',
        ]),
      ),
    );
    const events = await collect(
      geminiStream({ model: "gemini-2.5-flash", apiKey: "gk" }, "tiny prompt", [], ac.signal),
    );
    const done = events[events.length - 1] as { type: string; usage: { inputTokens: number; outputTokens: number } };
    expect(done.usage.inputTokens).toBe(2);
    expect(done.usage.outputTokens).toBeGreaterThanOrEqual(1);
  });

  it("surfaces non-2xx responses with the parsed error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({ error: { message: "bad words" } }),
        }) as unknown as Response,
      ),
    );
    await expect(
      collect(
        geminiStream({ model: "gemini-2.5-flash", apiKey: "gk" }, "hi", [], ac.signal),
      ),
    ).rejects.toThrow("Gemini 400: bad words");
  });

  it("preserves the status text when the error body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          json: async () => {
            throw new Error("parse failed");
          },
        }) as unknown as Response,
      ),
    );
    await expect(
      collect(
        geminiStream({ model: "gemini-2.5-flash", apiKey: "gk" }, "hi", [], ac.signal),
      ),
    ).rejects.toThrow("Gemini 429: Too Many Requests");
  });

  it("throws on an in-stream error payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        okResponse(['data: {"error":{"message":"rate limited"}}\n']),
      ),
    );
    await expect(
      collect(
        geminiStream({ model: "gemini-2.5-flash", apiKey: "gk" }, "hi", [], ac.signal),
      ),
    ).rejects.toThrow("rate limited");
  });
});

describe("geminiAdapter", () => {
  it("throws when no key is supplied", async () => {
    const adapter = geminiAdapter({ defaultModel: "gemini-2.5-flash" });
    expect(() => collect(adapter(makeReq()))).toThrow("Missing API key");
  });

  it("delegates with the configured model", async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
      okResponse([
        'data: {"candidates":[{"content":{"parts":[{"text":"hey"}]},"finishReason":"STOP"}]}\n',
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);
    const adapter = geminiAdapter({ defaultModel: "gemini-2.5-pro" });
    const events = await collect(adapter(makeReq({ provider: "gemini" }), "key"));
    expect(events[0]).toEqual({ type: "token", value: "hey" });
    expect(fetchMock.mock.calls[0][0]).toContain(
      "/models/gemini-2.5-pro:streamGenerateContent",
    );
  });
});

describe("mockStream", () => {
  it("streams tokens and a done event without a key", async () => {
    const req = makeReq({ prompt: "hi there, friend!" });
    const events = (await collect(mockStream(req))) as Array<{
      type: string;
      value?: string;
    }>;
    expect(events[0].type).toBe("token");
    expect(events.every((e) => e.type === "token" || e.type === "done")).toBe(true);
    expect(events[events.length - 1]).toMatchObject({ type: "done" });
  });
});

describe("provider registry", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it("registers the expected providers", () => {
    expect(PROVIDER_IDS).toEqual([
      "mock",
      "gemini",
      "openai",
      "openrouter",
      "groq",
      "together",
      "mistral",
      "deepseek",
    ]);
    expect(PROVIDERS.mock.name).toBe("Simulated (free)");
    expect(PROVIDERS.mock.requiresKey).toBe(false);
    expect(PROVIDERS.mock.defaultModel).toBe("mock");
    expect(PROVIDERS.gemini.requiresKey).toBe(true);
    expect(PROVIDERS.gemini.defaultModel).toBe("gemini-2.5-flash");
    expect(PROVIDERS.gemini.envVar).toBe("VITE_GEMINI_API_KEY");
    expect(PROVIDERS.openai.defaultModel).toBe("gpt-4o-mini");
    expect(PROVIDERS.openrouter.defaultModel).toBe("openai/gpt-4o-mini");
  });

  it("keyStatus is none and getApiKey is null for keyless providers", () => {
    expect(keyStatus("mock")).toBe("none");
    expect(getApiKey("mock")).toBeNull();
  });

  it("reads keys from env vars first", () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "env-key");
    expect(getApiKey("gemini")).toBe("env-key");
    expect(keyStatus("gemini")).toBe("env");
  });

  it("reads stored keys when no env var is set", () => {
    setApiKey("gemini", " stored-key ");
    expect(getApiKey("gemini")).toBe("stored-key");
    expect(keyStatus("gemini")).toBe("stored");
  });

  it("clears the stored key when set to blank and keeps status none", () => {
    setApiKey("gemini", "some-key");
    setApiKey("gemini", "   ");
    expect(getApiKey("gemini")).toBeNull();
    expect(keyStatus("gemini")).toBe("none");
  });

  it("clearApiKeys wipes all stored keys", () => {
    setApiKey("gemini", "one");
    setApiKey("openai", "two");
    clearApiKeys();
    expect(getApiKey("gemini")).toBeNull();
    expect(keyStatus("openai")).toBe("none");
  });
});

describe("createProviderStream", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("streams the mock provider directly", async () => {
    const events = await collect(createProviderStream(makeReq({ provider: "mock" })));
    expect(events[0]).toMatchObject({ type: "token" });
  });

  it("falls back to the simulated stream when a keyed provider has no key", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("fetch should not be called");
    });
    vi.stubGlobal("fetch", fetchMock);
    const events = await collect(
      createProviderStream(makeReq({ provider: "gemini" })),
    );
    expect(events[0]).toMatchObject({ type: "token" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the real provider stream when a key is present", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "real-key");
    const fetchMock = vi.fn(async () =>
      okResponse([
        'data: {"candidates":[{"content":{"parts":[{"text":"real"}]},"finishReason":"STOP"}]}\n',
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);
    const events = await collect(createProviderStream(makeReq({ provider: "gemini" })));
    expect(events[0]).toEqual({ type: "token", value: "real" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

beforeEach(() => {
  ac = new AbortController();
});
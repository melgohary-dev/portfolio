import type { StreamEvent, Usage } from "../types";

/**
 * Deterministic pseudo-random generator (mulberry32) so tests are stable.
 * Optional seed param lets tests control pacing/determinism.
 */
export function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

type TemplateKey = "greetings" | "explain" | "code" | "list" | "default";

const TEMPLATES: Record<TemplateKey, string | string[]> = {
  greetings: [
    "Hi! I'm your AI workspace assistant. I can chat, explain concepts, write code, and format answers with rich markdown. What would you like to work on?",
    "Hello there. I'm ready to help with anything from quick questions to full code reviews. Ask me something.",
  ],
  explain: `Here's a clear breakdown of that topic:

### Key idea

At its core, the concept revolves around moving work off the main thread and into isolated, controlled units that communicate through well-defined interfaces. This keeps the user interface responsive even under heavy load.

### Why it matters

- **Performance** — long tasks no longer block rendering
- **Maintainability** — clear separation of concerns
- **Testability** — pure, isolated logic is easy to verify

### Practical takeaway

Start small: extract one slow, pure function, move it behind an interface, and swap in an optimized implementation. Refactor iteratively rather than rewriting everything at once.`,
  code: `Absolutely. Here's a clean, typed implementation:

\`\`\`ts
export function createWorker<TIn, TOut>(
  fn: (input: TIn) => TOut,
): (input: TIn) => Promise<TOut> {
  const blob = new Blob([stringified(fn)], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);

  return (input) =>
    new Promise((resolve, reject) => {
      worker.onmessage = (e) => {
        URL.revokeObjectURL(url);
        resolve(e.data);
      };
      worker.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      worker.postMessage(input);
    });
}
\`\`\`

The snippet defers execution to a Web Worker, returns a typed \`Promise\`, and cleans up the object URL in both the success and error paths so you never leak memory.

Note: markdown code blocks, inline \`code\`, **bold**, and lists all render in this workspace — exactly what a production chat surface needs.`,
  list: `Here are the key points, formatted as a clean list:

- **Streaming** — responses appear token-by-token with a live cursor
- **Sessions** — your conversations persist and are resumable after reload
- **Markdown** — code blocks, lists, and emphasis render safely
- **Keyboard-first** — \`Enter\` sends, \`Shift+Enter\` adds a newline
- **Theming** — a polished dark or light surface you control

Each item above covers a core feature you can try right now.`,
  default: `Thanks for your message. This is a simulated streaming assistant, so I don't have live model inference wired up — but the UI you're looking at is fully real.

Here's what's happening under the hood:

- **Token streaming** — my reply is emitted piece-by-piece, exactly like a production LLM stream
- **Cancellation** — hit \`Stop\` and I halt immediately, keeping whatever I already wrote
- **Persistence** — every session is saved locally and restored on reload

Try asking for "code", "explain", or "list" to see different response shapes, or type anything at all.`,
};
type TemplateKind = "greetings" | "explain" | "code" | "list" | "default";

function detectTemplate(prompt: string): TemplateKind {
  const p = prompt.toLowerCase();
  if (/^(hi|hey|hello|yo|hi there|good (morning|afternoon|evening))(\b|,|!)/.test(p.trim())) {
    return "greetings";
  }
  if (/\b(write|code|function|implement|typescript|example)\b/.test(p)) {
    return "code";
  }
  if (/\b(explain|what is|how does|why|define|elaborate)\b/.test(p)) {
    return "explain";
  }
  if (/\b(list|points|bullets|steps|tips)\b/.test(p)) {
    return "list";
  }
  return "default";
}

export function buildResponseText(prompt: string, seed: number): string {
  const kind = detectTemplate(prompt);
  const rand = mulberry32(seed);
  if (kind === "greetings") {
    const pool = TEMPLATES.greetings as string[];
    return pool[Math.floor(rand() * pool.length)];
  }
  return TEMPLATES[kind] as string;
}

/**
 * Async generator that streams a response as a sequence of StreamEvents,
 * token-by-token with realistic pacing. Throws an AbortError when the
 * provided signal aborts (should be thrown by runStream's consumer).
 */
export async function* createMockStream(
  prompt: string,
  opts: { seed?: number; tokenDelay?: [number, number] } = {},
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const seed = opts.seed ?? Date.now();
  const rand = mulberry32(seed);
  const [minDelay, maxDelay] = opts.tokenDelay ?? [8, 40];
  const text = buildResponseText(prompt, seed);
  const tokens = text.split(/(\s+)/).filter((t) => t.length > 0);

  const sleep = (ms: number, abortSignal?: AbortSignal): Promise<void> =>
    new Promise((resolve, reject) => {
      if (abortSignal?.aborted) {
        const err = new Error("Aborted");
        err.name = "AbortError";
        reject(err);
        return;
      }
      const done = () => {
        abortSignal?.removeEventListener("abort", onAbort);
        clearTimeout(timer);
      };
      const onAbort = () => {
        done();
        const err = new Error("Aborted");
        err.name = "AbortError";
        reject(err);
      };
      const timer = setTimeout(() => {
        done();
        resolve();
      }, ms);
      abortSignal?.addEventListener("abort", onAbort, { once: true });
    });

  for (const token of tokens) {
    await sleep(minDelay + rand() * (maxDelay - minDelay), signal);
    yield { type: "token", value: token };
  }

  const outputTokens = countWords(text) + Math.floor(rand() * 20);
  const inputTokens = countWords(prompt);
  yield { type: "done", usage: { inputTokens, outputTokens } };
}

/**
 * Drive a mock stream generator to completion, invoking callbacks.
 * Resolves true when it finishes, false when aborted, and calls onError on failure.
 */
export async function runStream(
  prompt: string,
  opts: {
    signal: AbortSignal;
    seed?: number;
    tokenDelay?: [number, number];
    onToken: (token: string) => void;
    onDone: (usage: Usage) => void;
    onError: (message: string) => void;
  },
): Promise<"done" | "aborted"> {
  let aborted = false;
  const abortHandler = () => {
    aborted = true;
  };
  opts.signal.addEventListener("abort", abortHandler, { once: true });
  try {
    const gen = createMockStream(prompt, { seed: opts.seed, tokenDelay: opts.tokenDelay }, opts.signal);
    for await (const event of gen) {
      if (event.type === "token") opts.onToken(event.value);
      else if (event.type === "done") opts.onDone(event.usage);
    }
    return "done";
  } catch (err) {
    if (aborted || (err instanceof Error && err.name === "AbortError")) {
      return "aborted";
    }
    opts.onError(err instanceof Error ? err.message : "Unknown error");
    return "done";
  } finally {
    opts.signal.removeEventListener("abort", abortHandler);
  }
}

export function estimateUsage(prompt: string, response: string): Usage {
  return {
    inputTokens: countWords(prompt),
    outputTokens: countWords(response),
  };
}

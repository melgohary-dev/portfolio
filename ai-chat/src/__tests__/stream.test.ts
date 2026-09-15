import { describe, it, expect } from "vitest";
import {
  buildResponseText,
  createMockStream,
  runStream,
  estimateUsage,
  mulberry32,
} from "../lib/stream";
import type { StreamEvent, Usage } from "../types";

describe("buildResponseText", () => {
  it("returns a greeting-shaped response for greetings", () => {
    const text = buildResponseText("hello", 123);
    expect(text).toMatch(/hi|hello|hey|ready to help/i);
  });

  it("returns a code-shaped response when asked to write code", () => {
    const text = buildResponseText("write a function in typescript", 123);
    expect(text).toContain("```ts");
  });

  it("returns an explain-shaped response for explain", () => {
    const text = buildResponseText("explain offline first", 123);
    expect(text).toMatch(/Key idea/i);
  });

  it("returns a list-shaped response for list", () => {
    const text = buildResponseText("list best practices", 123);
    expect(text).toContain("- **Streaming**");
  });

  it("returns the default text for unknown prompts", () => {
    const text = buildResponseText("banana phone", 123);
    expect(text).toContain("simulated streaming assistant");
  });

  it("is deterministic for a given seed", () => {
    expect(buildResponseText("hello", 42)).toBe(buildResponseText("hello", 42));
  });
});

describe("createMockStream", () => {
  it("yields tokens that concatenate to a non-empty message", async () => {
    const events: StreamEvent[] = [];
    for await (const evt of createMockStream("hello", { seed: 1, tokenDelay: [1, 1] })) {
      events.push(evt);
    }
    const text = events
      .filter((e) => e.type === "token")
      .map((e) => (e as { type: "token"; value: string }).value)
      .join("");
    expect(text.length).toBeGreaterThan(10);
    expect(events.some((e) => e.type === "done")).toBe(true);
  });

  it("emits a done event with usage totals", async () => {
    let got: Usage | undefined;
    for await (const evt of createMockStream("write code", { seed: 5, tokenDelay: [1, 1] })) {
      if (evt.type === "done") got = evt.usage;
    }
    expect(got).toBeDefined();
    expect(got!.inputTokens).toBeGreaterThan(0);
    expect(got!.outputTokens).toBeGreaterThan(0);
  }, 15000);

  it("aborts and stops early when the signal aborts", async () => {
    const controller = new AbortController();
    const tokens: string[] = [];
    const gen = createMockStream(
      "list best practices",
      { seed: 7, tokenDelay: [5, 5] },
      controller.signal,
    );
    let result: "done" | "aborted" = "done";
    try {
      for await (const evt of gen) {
        if (evt.type === "token") {
          tokens.push(evt.value);
          controller.abort();
        }
      }
    } catch (err) {
      result = err instanceof Error && err.name === "AbortError" ? "aborted" : "done";
    }
    expect(result).toBe("aborted");
    expect(tokens.length).toBeGreaterThan(0);
  });
});

describe("runStream", () => {
  it("drives callbacks to completion and returns done", async () => {
    const controller = new AbortController();
    let acc = "";
    let gotUsage: Usage | undefined;
    let error: string | undefined;
    const result = await runStream("explain x", {
      signal: controller.signal,
      seed: 11,
      tokenDelay: [2, 2],
      onToken: (t) => (acc += t),
      onDone: (u) => (gotUsage = u),
      onError: (m) => (error = m),
    });
    expect(result).toBe("done");
    expect(acc.length).toBeGreaterThan(10);
    expect(gotUsage).toBeDefined();
    expect(error).toBeUndefined();
  });

  it("returns aborted when the signal aborts mid-stream", async () => {
    const controller = new AbortController();
    let called = 0;
    const result = await (async () => {
      const gen = createMockStream(
        "list best practices",
        { seed: 3, tokenDelay: [5, 5] },
        controller.signal,
      );
      let res: "done" | "aborted" = "done";
      try {
        for await (const evt of gen) {
          if (evt.type === "token") {
            called++;
            controller.abort();
          }
        }
      } catch (err) {
        res = err instanceof Error && err.name === "AbortError" ? "aborted" : "done";
      }
      return res;
    })();
    expect(result).toBe("aborted");
    expect(called).toBeGreaterThan(0);
  });
});

describe("estimateUsage", () => {
  it("counts words when output is empty", () => {
    const u = estimateUsage("hello world", "");
    expect(u.inputTokens).toBe(2);
    expect(u.outputTokens).toBe(0);
  });
});

describe("mulberry32", () => {
  it("produces values in [0,1)", () => {
    const rand = mulberry32(1234);
    for (let i = 0; i < 100; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it("is deterministic", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });
});

import { describe, it, expect } from "vitest";
import {
  segmentMarkdown,
  renderMarkdownText,
  renderMarkdown,
  titleFromPrompt,
} from "../lib/markdown";

describe("segmentMarkdown", () => {
  it("splits prose from fenced code blocks", () => {
    const segments = segmentMarkdown("before\n```ts\nconst a = 1;\n```\nafter");
    expect(segments).toHaveLength(3);
    expect(segments[0]).toEqual({ kind: "text", value: "before\n" });
    expect(segments[1]).toEqual({
      kind: "code",
      value: { language: "ts", code: "const a = 1;" },
    });
    expect(segments[2]).toEqual({ kind: "text", value: "\nafter" });
  });

  it("handles source with no code fences", () => {
    const segments = segmentMarkdown("just text");
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe("text");
  });
});

describe("renderMarkdownText", () => {
  it("renders headings, bold, italic and inline code", () => {
    const html = renderMarkdownText(
      "# Title\n\nSome **bold** and *italic* with `code`.",
    );
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<code>code</code>");
  });

  it("renders un-ordered and ordered lists", () => {
    const html = renderMarkdownText("- one\n- two\n\n1. a\n2. b");
    expect(html).toContain("<ul>");
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>one</li>");
  });

  it("renders links", () => {
    const html = renderMarkdownText("see [GitHub](https://github.com)");
    expect(html).toContain('href="https://github.com"');
  });

  it("sanitizes dangerous HTML", () => {
    const html = renderMarkdownText('<script>alert("x")</script>safe');
    expect(html).not.toContain("<script");
    expect(html).toContain("safe");
  });
});

describe("renderMarkdown", () => {
  it("returns html and code segments", () => {
    const segments = renderMarkdown("hi\n```js\nx\n```");
    expect(segments[0].kind).toBe("html");
    expect(segments[1].kind).toBe("code");
  });
});

describe("titleFromPrompt", () => {
  it("keeps short prompts", () => {
    expect(titleFromPrompt("hello world")).toBe("hello world");
  });
  it("collapses whitespace", () => {
    expect(titleFromPrompt("  a    b  ")).toBe("a b");
  });
  it("truncates long prompts with an ellipsis", () => {
    const long = "a".repeat(60);
    expect(titleFromPrompt(long)).toHaveLength(41);
    expect(titleFromPrompt(long).endsWith("…")).toBe(true);
  });
  it("falls back to New chat for empty input", () => {
    expect(titleFromPrompt("   ")).toBe("New chat");
  });
});

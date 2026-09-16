import { describe, it, expect } from "vitest";
import { highlightCode } from "../lib/highlight";

describe("highlightCode", () => {
  it("emits token spans for a known language", () => {
    const html = highlightCode("const value: number = 42;", "typescript");
    expect(html).toContain('class="hljs-keyword"');
    expect(html).toContain('class="hljs-number"');
  });

  it("resolves language aliases", () => {
    const html = highlightCode("def add(a, b):\n    return a + b", "py");
    expect(html).toContain('class="hljs-keyword"');
  });

  it("falls back to auto-detection for unknown languages", () => {
    const html = highlightCode("function hello() { return 1; }", "not-a-lang");
    expect(html).toContain("hljs-");
  });

  it("defaults to plaintext when no language is given", () => {
    expect(highlightCode("just some text")).toBe("just some text");
  });

  it("treats text/txt/plaintext labels as plaintext", () => {
    expect(highlightCode("a < b", "text")).toBe("a &lt; b");
    expect(highlightCode("hello", "txt")).toBe("hello");
    expect(highlightCode("hi", "plaintext")).toBe("hi");
  });

  it("escapes HTML in highlighted output", () => {
    const html = highlightCode("<div>\n  <p>hi</p>\n</div>", "html");
    expect(html).not.toContain("<div");
    expect(html).toContain("hljs-tag");
  });
});
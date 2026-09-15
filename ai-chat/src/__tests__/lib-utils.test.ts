import { describe, it, expect } from "vitest";
import { cn } from "../lib/cn";
import { createWelcomeSession, SUGGESTED_PROMPTS } from "../lib/seed";

describe("cn", () => {
  it("merges class names trivially", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("handles conditional and falsey values", () => {
    const falsy = "";
    const isActive = false;
    expect(cn("a", isActive && "active", falsy, null, "b")).toBe("a b");
  });

  it("deduplicates conflicting Tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});

describe("seed", () => {
  it("creates a welcome session with one assistant message", () => {
    const s = createWelcomeSession();
    expect(s.title).toBe("Welcome");
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0].role).toBe("assistant");
    expect(s.messages[0].status).toBe("done");
    expect(s.messages[0].content).toContain("Welcome to your AI workspace");
  });

  it("exposes suggested prompts", () => {
    expect(SUGGESTED_PROMPTS.length).toBeGreaterThan(0);
    expect(SUGGESTED_PROMPTS[0]).toContain("offline-first");
  });
});

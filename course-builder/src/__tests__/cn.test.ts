import { describe, it, expect } from "vitest";
import { cn } from "../lib/cn";

describe("cn", () => {
  it("merges class names", () => {
    const result = cn("foo", "bar");
    expect(result).toBe("foo bar");
  });

  it("deduplicates Tailwind classes", () => {
    const result = cn("p-2 p-4");
    expect(result).toBe("p-4");
  });

  it("handles conditional classes", () => {
    const hidden = false;
    const result = cn("base", hidden && "hidden", "extra");
    expect(result).toBe("base extra");
  });

  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });
});

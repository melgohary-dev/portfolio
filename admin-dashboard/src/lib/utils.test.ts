import { describe, it, expect } from "vitest";
import { cn, formatNumber } from "./utils";

describe("cn", () => {
  it("merges two class names", () => {
    const result = cn("foo", "bar");
    expect(result).toContain("foo");
    expect(result).toContain("bar");
  });

  it("deduplicates tailwind classes", () => {
    const result = cn("p-2", "p-4");
    expect(result).toBe("p-4");
  });

  it("handles falsy values", () => {
    const result = cn("foo", false, null, undefined, "");
    expect(result).toBe("foo");
  });

  it("handles conditional classes", () => {
    const isActive = true;
    const result = cn("base", isActive && "active", !isActive && "inactive");
    expect(result).toContain("base");
    expect(result).toContain("active");
    expect(result).not.toContain("inactive");
  });

  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });
});

describe("formatNumber", () => {
  it("formats a simple number", () => {
    expect(formatNumber(1234)).toBe("1,234");
  });

  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("formats large numbers", () => {
    expect(formatNumber(120000)).toBe("120,000");
  });

  it("formats negative numbers", () => {
    expect(formatNumber(-5000)).toBe("-5,000");
  });

  it("formats decimals", () => {
    expect(formatNumber(1234.56)).toBe("1,234.56");
  });
});

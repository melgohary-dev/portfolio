import { describe, it, expect } from "vitest";
import { createBlock, createId } from "../lib/defaults";
import { getLocalized } from "../lib/localization";

const lang = "en" as const;
const get = (obj: { en: string; ar: string; fr: string; de: string }) => getLocalized(obj, lang);

describe("createId", () => {
  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => createId()));
    expect(ids.size).toBe(100);
  });

  it("generates 10-character IDs", () => {
    expect(createId()).toHaveLength(10);
  });
});

describe("createBlock", () => {
  it("text block has correct defaults", () => {
    const block = createBlock("text");
    expect(block.type).toBe("text");
    expect(get(block.title)).toBe("Text Block");
    expect(block.content).toBeTruthy();
    expect(block.duration).toBe(5);
    expect(block.id).toBeTruthy();
  });

  it("video block has correct defaults", () => {
    const block = createBlock("video");
    expect(block.type).toBe("video");
    expect(get(block.title)).toBe("Video Lesson");
    expect(block.metadata).toHaveProperty("url");
    expect(block.duration).toBe(10);
  });

  it("quiz block has correct defaults", () => {
    const block = createBlock("quiz");
    expect(block.type).toBe("quiz");
    expect(get(block.title)).toBe("Quiz");
    expect(block.metadata).toHaveProperty("questions");
  });

  it("image block has correct defaults", () => {
    const block = createBlock("image");
    expect(block.type).toBe("image");
    expect(get(block.title)).toBe("Image");
    expect(block.metadata).toHaveProperty("src");
    expect(block.metadata).toHaveProperty("caption");
    expect(block.metadata).toHaveProperty("alt");
  });

  it("assignment block has correct defaults", () => {
    const block = createBlock("assignment");
    expect(block.type).toBe("assignment");
    expect(get(block.title)).toBe("Assignment");
    expect(block.content).toBeTruthy();
    expect(block.metadata).toHaveProperty("maxScore");
  });

  it("divider block has correct defaults", () => {
    const block = createBlock("divider");
    expect(block.type).toBe("divider");
    expect(get(block.title)).toBe("");
    expect(get(block.content)).toBe("");
  });

  it("each block gets a unique ID", () => {
    const blocks = Array.from({ length: 50 }, () => createBlock("text"));
    const ids = new Set(blocks.map((b) => b.id));
    expect(ids.size).toBe(50);
  });

  it("all blocks have LocalizedText for title and content", () => {
    const types = ["text", "video", "quiz", "image", "assignment", "divider"] as const;
    for (const type of types) {
      const block = createBlock(type);
      expect(block.title).toHaveProperty("en");
      expect(block.title).toHaveProperty("ar");
      expect(block.title).toHaveProperty("fr");
      expect(block.title).toHaveProperty("de");
      expect(block.content).toHaveProperty("en");
      expect(block.content).toHaveProperty("ar");
      expect(block.content).toHaveProperty("fr");
      expect(block.content).toHaveProperty("de");
    }
  });
});

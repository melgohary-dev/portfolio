import { describe, it, expect, beforeEach } from "vitest";
import { saveJson, loadJson, removeItem } from "../lib/persist";

describe("persist", () => {
  beforeEach(() => localStorage.clear());

  it("saveJson writes JSON to localStorage", () => {
    saveJson("test:key", { a: 1 });
    expect(localStorage.getItem("test:key")).toBe(JSON.stringify({ a: 1 }));
  });

  it("loadJson reads and parses", () => {
    localStorage.setItem("test:key", JSON.stringify([1, 2, 3]));
    expect(loadJson<number[]>("test:key")).toEqual([1, 2, 3]);
  });

  it("loadJson returns null when missing", () => {
    expect(loadJson("missing")).toBeNull();
  });

  it("loadJson returns null on corrupt data", () => {
    localStorage.setItem("test:key", "{not valid json");
    expect(loadJson("test:key")).toBeNull();
  });

  it("removeItem deletes the key", () => {
    localStorage.setItem("test:key", "1");
    removeItem("test:key");
    expect(localStorage.getItem("test:key")).toBeNull();
  });
});

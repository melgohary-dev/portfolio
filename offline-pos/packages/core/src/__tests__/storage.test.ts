import { describe, it, expect, beforeEach } from "vitest";
import { MemoryStorageProvider } from "../storage";
import { LocalStorageProvider } from "../browser/local-storage";

describe("LocalStorageProvider", () => {
  let provider: LocalStorageProvider;

  beforeEach(() => {
    localStorage.clear();
    provider = new LocalStorageProvider();
  });

  it("returns null for a missing key", () => {
    expect(provider.get("nope")).toBeNull();
  });

  it("round-trips JSON values", () => {
    provider.set("order", { id: "ord_1", total: 10.5 });
    expect(provider.get<{ id: string; total: number }>("order")).toEqual({
      id: "ord_1",
      total: 10.5,
    });
  });

  it("returns null for corrupt JSON", () => {
    localStorage.setItem("bad", "{not json");
    expect(provider.get("bad")).toBeNull();
  });

  it("removes keys", () => {
    provider.set("k", 1);
    provider.remove("k");
    expect(provider.get("k")).toBeNull();
  });

  it("clears all keys", () => {
    provider.set("a", 1);
    provider.set("b", 2);
    provider.clear();
    expect(provider.get("a")).toBeNull();
    expect(provider.get("b")).toBeNull();
  });
});

describe("MemoryStorageProvider", () => {
  it("mirrors the StorageProvider contract", () => {
    const provider = new MemoryStorageProvider();
    expect(provider.get("x")).toBeNull();
    provider.set("x", [1, 2]);
    expect(provider.get<number[]>("x")).toEqual([1, 2]);
    provider.remove("x");
    expect(provider.get("x")).toBeNull();
  });
});

import { describe, expect, it, vi } from "vitest";
import { createInsertDraftStorage } from "../insert-draft-storage";

describe("Insert drafts", () => {
  it("restores the latest source per project and clears it after insertion", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
    const drafts = createInsertDraftStorage(() => storage, vi.fn());
    drafts.write("a", "first");
    drafts.write("a", "latest");
    drafts.write("b", "other");
    const restored = createInsertDraftStorage(() => storage, vi.fn());
    expect(restored.read("a")).toBe("latest");
    expect(restored.read("b")).toBe("other");
    restored.write("a", "");
    expect(restored.read("a")).toBe("");
    expect(restored.read("b")).toBe("other");
  });

  it("reports storage access failures without throwing", () => {
    const onError = vi.fn();
    const drafts = createInsertDraftStorage(() => {
      throw new Error("blocked");
    }, onError);
    expect(drafts.read("a")).toBe("");
    expect(() => drafts.write("a", "text")).not.toThrow();
    expect(() => drafts.write("a", "")).not.toThrow();
    expect(onError).toHaveBeenCalledTimes(3);
  });
});

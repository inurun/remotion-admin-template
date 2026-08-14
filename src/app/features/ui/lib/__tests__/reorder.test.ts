import { describe, expect, it } from "vitest";
import { moveItem } from "@/app/features/ui/lib/reorder";

describe("moveItem", () => {
  it("moves an item by index without mutating the source array", () => {
    const items = ["a", "b", "c"];

    expect(moveItem(items, 0, 2)).toEqual(["b", "c", "a"]);
    expect(items).toEqual(["a", "b", "c"]);
  });

  it("returns the original array when the source index is missing", () => {
    const items = ["a", "b", "c"];

    expect(moveItem(items, 9, 0)).toBe(items);
  });
});

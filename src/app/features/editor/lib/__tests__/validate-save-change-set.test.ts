import { describe, expect, it } from "vitest";
import {
  isEmptyChangeSet,
  validateChangeSet,
} from "@/app/features/editor/lib/validate-save-change-set";

describe("validate save change set", () => {
  it("treats forceResynthesis as a real change", () => {
    expect(
      isEmptyChangeSet({
        upsertItems: [],
        removedItemIds: [],
      }),
    ).toBe(true);
    expect(
      isEmptyChangeSet({
        upsertItems: [],
        removedItemIds: [],
        forceResynthesis: true,
      }),
    ).toBe(false);
  });

  it("surfaces the first validation issue", () => {
    expect(() =>
      validateChangeSet({
        upsertItems: [
          {
            id: "page-1",
            title: "Page 1",
            type: "main",
            meta: { tags: [] },
            padBeforeSec: -1,
            padAfterSec: 0,
            richText: null,
            tts: [],
          },
        ],
        removedItemIds: [],
      }),
    ).toThrow();
  });
});

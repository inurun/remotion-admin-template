import { describe, expect, it } from "vitest";
import { resolveSelectedPageSummary } from "@/app/features/page/lib/page-summary";

describe("resolveSelectedPageSummary", () => {
  it("keeps identity fields and tags only", () => {
    expect(
      resolveSelectedPageSummary(2, "page-2", "Endcard", "endcard", undefined, ["news"]),
    ).toEqual({
      id: "page-2",
      title: "Endcard",
      type: "endcard",
      meta: { tags: ["news"] },
    });
  });

  it("returns null when the selection is incomplete", () => {
    expect(
      resolveSelectedPageSummary(null, "page-2", "Endcard", "endcard", undefined, []),
    ).toBeNull();
    expect(
      resolveSelectedPageSummary(0, undefined, "Endcard", "endcard", undefined, []),
    ).toBeNull();
    expect(resolveSelectedPageSummary(0, "page-2", "Endcard", undefined, undefined, [])).toBeNull();
  });

  it("includes variant only for transitions", () => {
    expect(resolveSelectedPageSummary(0, "tr", "", "transition", "slide", undefined)).toEqual({
      id: "tr",
      title: "",
      type: "transition",
      variant: "slide",
      meta: { tags: [] },
    });
    expect(resolveSelectedPageSummary(0, "page-1", "Main", "main", "slide", [])).toEqual({
      id: "page-1",
      title: "Main",
      type: "main",
      meta: { tags: [] },
    });
  });
});

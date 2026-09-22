import { describe, expect, it } from "vitest";
import {
  getPageSettingsTags,
  getSelectedPageSettingsFormValues,
  pageSettingsFormSchema,
  toPageSettingsFormValues,
} from "./page-settings-dialog.lib";

describe("page settings values", () => {
  it("preserves tag order and duplicates while trimming values", () => {
    const parsed = pageSettingsFormSchema.parse({
      title: "Page",
      tags: [{ value: " travel " }, { value: "news" }, { value: " travel " }],
      presentation: "single",
    });

    expect(getPageSettingsTags(parsed)).toEqual(["travel", "news", "travel"]);
  });

  it("converts existing page values to field rows", () => {
    expect(toPageSettingsFormValues({ title: "Page", tags: ["travel", "news"] })).toEqual({
      title: "Page",
      tags: [{ value: "travel" }, { value: "news" }],
      presentation: "single",
    });
  });

  it("resolves selected and missing page values", () => {
    expect(
      getSelectedPageSettingsFormValues({ title: "Page", meta: { tags: ["travel"] } }),
    ).toEqual({
      title: "Page",
      tags: [{ value: "travel" }],
      presentation: "single",
    });
    expect(getSelectedPageSettingsFormValues(null)).toEqual({
      title: "",
      tags: [],
      presentation: "single",
    });
  });

  it("rejects blank tags and accepts an empty list", () => {
    expect(
      pageSettingsFormSchema.safeParse({ title: "", tags: [], presentation: "single" }).success,
    ).toBe(true);
    expect(
      pageSettingsFormSchema.safeParse({
        title: "",
        tags: [{ value: "   " }],
        presentation: "single",
      }).success,
    ).toBe(false);
  });
});

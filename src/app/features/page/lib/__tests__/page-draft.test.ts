import { describe, expect, it } from "vitest";
import { createBlankDraftPage } from "@/app/features/page/lib/page-draft";

describe("page draft", () => {
  it("creates a blank draft page with selected type and title", () => {
    expect(
      createBlankDraftPage({
        id: "page-id",
        title: "  Outro  ",
        type: "outro",
      }),
    ).toEqual({
      id: "page-id",
      title: "  Outro  ",
      type: "outro",
      meta: { tags: [], blocks: [] },
      padBeforeSec: 0,
      padAfterSec: 0,
      richText: null,
      tts: [],
    });
  });

  it("keeps blank titles unchanged", () => {
    expect(
      createBlankDraftPage({
        id: "page-id",
        title: "",
        type: "main",
      }).title,
    ).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import { createG2pItem } from "@/_schemas/__tests__/g2p-fixture";
import { getUnknownSourceSpans, mergeSourceSpans } from "../unknown-spans";

describe("unknown source spans", () => {
  it("merges overlapping spans", () => {
    expect(
      mergeSourceSpans([
        { start_utf16: 0, end_utf16: 2 },
        { start_utf16: 1, end_utf16: 4 },
        { start_utf16: 6, end_utf16: 7 },
      ]),
    ).toEqual([
      { start_utf16: 0, end_utf16: 4 },
      { start_utf16: 6, end_utf16: 7 },
    ]);
  });

  it("highlights emoji using UTF-16 indexes", () => {
    const text = "A𰻞B";
    const item = createG2pItem(text);
    item.warnings = [
      {
        code: "unknown_word",
        location: { segment_index: 0, word_index: 0 },
        source_span: { start_utf16: 1, end_utf16: 3 },
      },
    ];

    const [span] = getUnknownSourceSpans(item);
    expect(text.slice(span?.start_utf16 ?? 0, span?.end_utf16 ?? 0)).toBe("𰻞");
  });

  it("lists warnings without source spans separately from highlights", () => {
    const item = createG2pItem("hello");
    item.warnings = [
      {
        code: "unknown_word",
        location: { segment_index: 0, word_index: 0 },
      },
    ];

    expect(getUnknownSourceSpans(item)).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { getTextLines } from "../text-lines";

describe("getTextLines", () => {
  it("splits text by line and keeps sequential grapheme indexes", () => {
    expect(getTextLines("あい\nうえ")).toEqual([
      { chars: ["あ", "い"], key: "0-あい", startIndex: 0 },
      { chars: ["う", "え"], key: "1-うえ", startIndex: 3 },
    ]);
  });

  it("keeps empty lines", () => {
    expect(getTextLines("あ\n\nい")).toEqual([
      { chars: ["あ"], key: "0-あ", startIndex: 0 },
      { chars: [], key: "1-", startIndex: 2 },
      { chars: ["い"], key: "2-い", startIndex: 3 },
    ]);
  });

  it("handles CRLF line breaks", () => {
    expect(getTextLines("a\r\nb")).toEqual([
      { chars: ["a"], key: "0-a", startIndex: 0 },
      { chars: ["b"], key: "1-b", startIndex: 2 },
    ]);
  });

  it("keeps emoji grapheme clusters together", () => {
    expect(getTextLines("👨‍👩‍👧‍👦👍🏽")).toEqual([{ chars: ["👨‍👩‍👧‍👦", "👍🏽"], key: "0-👨‍👩‍👧‍👦👍🏽", startIndex: 0 }]);
  });

  it("keeps variation-selector kanji grapheme clusters together", () => {
    expect(getTextLines("葛󠄀")).toEqual([{ chars: ["葛󠄀"], key: "0-葛󠄀", startIndex: 0 }]);
  });
});

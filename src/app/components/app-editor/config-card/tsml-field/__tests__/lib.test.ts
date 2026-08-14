import { describe, expect, it } from "vitest";
import {
  getWordAttribute,
  serializeTsml,
  setPhraseBoundaryChain,
  splitPronunciationIntoMoras,
  type TsmlDocument,
  toggleWordHlAtIndex,
} from "../lib";

describe("tsml", () => {
  it("splits pronunciations into moras", () => {
    expect(splitPronunciationIntoMoras("きゃく")).toEqual(["きゃ", "く"]);
    expect(splitPronunciationIntoMoras("キャ'ク")).toEqual(["キャ", "ク"]);
  });

  it("toggles hl at the selected mora index", () => {
    const word = {
      text: "声",
      attributes: [{ name: "hl", value: "hl" }],
    };

    toggleWordHlAtIndex(word, 1);

    expect(getWordAttribute(word, "hl")).toBe("hh");
  });

  it("sets phrase boundary chain on the next word", () => {
    const document: TsmlDocument = {
      phrases: [
        {
          words: [
            { text: "a", attributes: [] },
            { text: "b", attributes: [{ name: "chain", value: "0" }] },
          ],
        },
      ],
    };

    setPhraseBoundaryChain(document, 0, 0, true);

    expect(getWordAttribute(document.phrases[0]!.words[1]!, "chain")).toBe("1");
  });

  it("escapes XML text and attributes when serializing", () => {
    const document: TsmlDocument = {
      phrases: [
        {
          words: [
            {
              text: '<声&">',
              attributes: [{ name: "pronunciation", value: '"こえ"&' }],
            },
          ],
        },
      ],
    };

    expect(serializeTsml(document)).toBe(
      '<tsml><acoustic_phrase><word pronunciation="&quot;こえ&quot;&amp;">&lt;声&amp;&quot;&gt;</word></acoustic_phrase></tsml>',
    );
  });
});

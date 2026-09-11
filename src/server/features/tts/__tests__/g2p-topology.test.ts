import { describe, expect, it } from "vitest";
import {
  automaticTopologyGuardError,
  parseG2pTopology,
  structuredPhrasesFromKana,
} from "../g2p-topology";

describe("g2p topology guard", () => {
  it("parses phrase count, boundaries, word slots, and accented word index", () => {
    expect(parseG2pTopology("ニンキ|ノ'/ナ'イ/ニンキ|スポ'ット")).toEqual({
      phrases: [
        { wordCount: 2, accentedWordIndex: 1, boundaryAfter: "/" },
        { wordCount: 1, accentedWordIndex: 0, boundaryAfter: "/" },
        { wordCount: 2, accentedWordIndex: 1, boundaryAfter: "" },
      ],
    });
  });

  it("accepts a conservative reading change that keeps topology", () => {
    expect(
      automaticTopologyGuardError("ニンキ'", {
        id: "tts-1",
        changed: true,
        phrases: [
          {
            leadingWords: [],
            trailingWords: [],
            boundaryAfter: "",
          },
        ],
      }),
    ).toBeUndefined();
  });

  it("rejects phrase, word, boundary, and accented-word changes", () => {
    const baseline = "ニンキ|ノ'/ナ'イ";
    expect(
      automaticTopologyGuardError(baseline, {
        id: "tts-1",
        changed: true,
        phrases: [
          {
            leadingWords: ["ニンキ"],
            trailingWords: [],
            boundaryAfter: "",
          },
        ],
      }),
    ).toContain("topology changed");
    expect(
      automaticTopologyGuardError(baseline, {
        id: "tts-1",
        changed: true,
        phrases: [
          {
            leadingWords: [],
            trailingWords: ["ノ"],
            boundaryAfter: "/",
          },
          {
            leadingWords: [],
            trailingWords: [],
            boundaryAfter: "",
          },
        ],
      }),
    ).toContain("topology changed");
    expect(
      automaticTopologyGuardError("ニンキ'", {
        id: "tts-1",
        changed: false,
        phrases: [],
      }),
    ).toBeUndefined();
  });

  it("converts baseline kana into output-shaped phrases", () => {
    expect(structuredPhrasesFromKana("タイショウ'")).toEqual([
      {
        leadingWords: [],
        accentedWord: { beforeNucleus: "タイショウ", afterNucleus: "" },
        trailingWords: [],
        boundaryAfter: "",
      },
    ]);
    expect(structuredPhrasesFromKana("アソコ|ヲ'/ダ|ヨ'ー|ネ")).toEqual([
      {
        leadingWords: ["アソコ"],
        accentedWord: { beforeNucleus: "ヲ", afterNucleus: "" },
        trailingWords: [],
        boundaryAfter: "/",
      },
      {
        leadingWords: ["ダ"],
        accentedWord: { beforeNucleus: "ヨ", afterNucleus: "ー" },
        trailingWords: ["ネ"],
        boundaryAfter: "",
      },
    ]);
  });
});

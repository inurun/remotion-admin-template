import { describe, expect, it } from "vitest";
import {
  automaticTopologyGuardError,
  dslSyntaxError,
  dslSyntaxErrors,
  parseG2pTopology,
  remountG2pKana,
  syntaxOrTopologyErrors,
  topologiesEqual,
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

  it("reports DSL syntax errors with phrase index and body", () => {
    expect(dslSyntaxError("")).toBe("kana is empty");
    expect(dslSyntaxError("ニンキ")).toContain("missing accent nucleus");
    expect(dslSyntaxError("ニンキ")).toContain("phrase 1");
    expect(dslSyntaxError("ニ'ン'キ")).toContain("2 accent nuclei");
    expect(dslSyntaxError("|ノ'")).toContain("empty word slot");
    expect(dslSyntaxError("ニンキ'/")).toContain("last phrase must not end with '/'");
    expect(dslSyntaxError("ニンキ'/ナ'イ")).toBeUndefined();
  });

  it("collects every phrase that is missing a nucleus", () => {
    expect(
      dslSyntaxErrors("サイチュー|ニ/ア'メ|ガ/フ'リ、キタク|ゴ'|ニ/モナカ|ヲ/タ'ベ|タ"),
    ).toEqual([
      'phrase 1 "サイチュー|ニ/": missing accent nucleus \'',
      'phrase 5 "モナカ|ヲ/": missing accent nucleus \'',
    ]);
  });

  it("tells repair that a missing slash merged two phrases", () => {
    const baseline = "イチニチ'|デ/シゴト|ヲ'/オエ'、イチニチジュー'/ネムッ|タ'";
    const candidate = "イチニチ'|デ/シゴト|ヲ'/オエ'、イチニチジュー'|ネムッ|タ'";
    expect(syntaxOrTopologyErrors(baseline, candidate, "tts-1", true)).toEqual([
      {
        kind: "syntax",
        message: expect.stringContaining("2 accent nuclei"),
      },
    ]);
    expect(syntaxOrTopologyErrors(baseline, candidate, "tts-1", true)[0]?.message).toContain(
      "Candidate dropped 1 '/'",
    );
  });

  it("accepts a conservative reading change that keeps topology", () => {
    expect(automaticTopologyGuardError("ニンキ'", "ヒトケ'", "tts-1")).toBeUndefined();
    expect(
      topologiesEqual(
        parseG2pTopology("アソコ|ヲ'/ダ|ヨ'ー|ネ")!,
        parseG2pTopology("アソコ|ヲ'/デ|ヨ'ー|ネ")!,
      ),
    ).toBe(true);
  });

  it("rejects phrase, word, boundary, and accented-word changes with a slot diff", () => {
    const baseline = "ニンキ|ノ'/ナ'イ";
    expect(automaticTopologyGuardError(baseline, "ニンキ'", "tts-1")).toContain(
      "phrase count baseline=2 candidate=1",
    );
    expect(automaticTopologyGuardError(baseline, "ニンキ'/ナ'イ", "tts-1")).toContain(
      "word slots 2->1",
    );
    expect(automaticTopologyGuardError("ニンキ'", "ニンキ'", "tts-1")).toBeUndefined();
  });
});

describe("remountG2pKana", () => {
  it("drops an extra nucleus on a non-nucleus slot", () => {
    expect(
      remountG2pKana(
        "カミテ|ナ'/ヒト|ガ'、ブ'タイ|ノ/カミテ|ニ'/タ'ッ|タ",
        "ジョ'ウズ|ナ'/ヒト|ガ'、ブ'タイ|ノ/カミテ|ニ'/タ'ッ|タ",
      ),
    ).toBe("ジョウズ|ナ'/ヒト|ガ'、ブ'タイ|ノ/カミテ|ニ'/タ'ッ|タ");
  });

  it("restores a missing nucleus at the baseline mora offset", () => {
    expect(
      remountG2pKana(
        "ヘタ'|ナ/ジ'|デ、ブ'タイ|ノ/ヘタ'|ニ/アンナ'イ|ヲ/カ'イ|タ",
        "ヘタ'|ナ/ジ'|デ、ブ'タイ|ノ/シモテ|ニ/アンナ'イ|ヲ/カ'イ|タ",
      ),
    ).toBe("ヘタ'|ナ/ジ'|デ、ブ'タイ|ノ/シモ'テ|ニ/アンナ'イ|ヲ/カ'イ|タ");
  });

  it("restores a dropped nucleus when phrase breaks are already present", () => {
    expect(remountG2pKana("ダイニ'ンキ/ナ'ク", "ダイニンキ/ナ'ク")).toBe("ダイニ'ンキ/ナ'ク");
  });

  it("copies baseline phrase breaks when the candidate dropped '/'", () => {
    expect(
      remountG2pKana(
        "ダイニ'ンキ|ノ/ミセ'|ニ、コドモ'|タチ|ガ/ダイニ'ンキ/ナ'ク/サワ'イ|ダ",
        "ダイニ'ンキ|ノ/ミセ'|ニ、コドモ'|タチ|ガ/ダイニンキ'|ナ'ク/サワ'イ|ダ",
      ),
    ).toBe("ダイニ'ンキ|ノ/ミセ'|ニ、コドモ'|タチ|ガ/ダイニンキ'/ナ'ク/サワ'イ|ダ");
  });

  it("merges extra candidate words into earlier baseline slots", () => {
    expect(remountG2pKana("シ'ジョー|デ", "イチ|バ'|デ")).toBe("イチバ'|デ");
  });

  it("does not guess splits when the candidate has fewer words", () => {
    expect(remountG2pKana("ココ|ヲ'/ダ|ヨ'ー", "ココ|デ'")).toBeUndefined();
  });
});

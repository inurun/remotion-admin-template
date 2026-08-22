import { describe, expect, it } from "vitest";
import { createG2pItem } from "@/_schemas/__tests__/g2p-fixture";
import { shouldApplyValidatedG2p } from "../use-g2p-analysis-editor";

describe("shouldApplyValidatedG2p", () => {
  const started = { text: "人気", kana: "ニンキ'" };

  it("commits when the request is current and the parent G2P is unchanged", () => {
    expect(shouldApplyValidatedG2p(started, createG2pItem("人気", "ニンキ'"), 1, 1)).toBe(true);
  });

  it("ignores a stale request", () => {
    expect(shouldApplyValidatedG2p(started, createG2pItem("人気", "ニンキ'"), 1, 2)).toBe(false);
  });

  it("ignores a result after Analyze or Apply replaced the parent G2P", () => {
    expect(shouldApplyValidatedG2p(started, createG2pItem("人気", "ヒトケ'"), 1, 1)).toBe(false);
    expect(
      shouldApplyValidatedG2p(started, createG2pItem("人気の無い人気スポット", "ニンキ'"), 1, 1),
    ).toBe(false);
  });
});

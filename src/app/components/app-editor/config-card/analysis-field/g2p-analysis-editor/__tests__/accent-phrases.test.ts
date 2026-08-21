import { describe, expect, it } from "vitest";
import { groupWordsByAccentPhrase } from "@/app/components/app-editor/config-card/analysis-field/g2p-analysis-editor/use-g2p-analysis-editor";

describe("G2P accent phrases", () => {
  it("groups chained words and keeps ignored words in their surrounding phrase", () => {
    expect(
      groupWordsByAccentPhrase([
        { chain: false, ignored: false },
        { chain: true, ignored: false },
        { chain: false, ignored: false },
        { chain: false, ignored: true },
        { chain: true, ignored: false },
      ]),
    ).toEqual([
      [0, 1],
      [2, 3, 4],
    ]);
  });
});

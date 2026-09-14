import { describe, expect, it } from "vitest";
import { ttsFormSchema } from "../tts-form-schema";
import { ameKoroAnalyzeItem, createG2pItem } from "@/_schemas/__tests__/g2p-fixture";

function voisonaForm(g2p: unknown) {
  return {
    id: "tts-1",
    provider: "voisona" as const,
    text: "雨衣",
    speech: { g2p },
  };
}

describe("tts form schema", () => {
  it("round-trips Analyze dictionary_words on speech.g2p", () => {
    expect(ttsFormSchema.parse(voisonaForm(ameKoroAnalyzeItem)).speech?.g2p).toEqual(
      ameKoroAnalyzeItem,
    );
  });

  it("still accepts G2P without dictionary_words", () => {
    const g2p = createG2pItem("雨衣", "アメコロ'");
    expect(ttsFormSchema.parse(voisonaForm(g2p)).speech?.g2p).toEqual(g2p);
  });
});

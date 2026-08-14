import { describe, expect, it } from "vitest";
import {
  cloneVoicevoxAudioQuery,
  mergeVoicevoxPhrases,
  parseVoicevoxAnalysis,
  serializeVoicevoxAnalysis,
  setVoicevoxAccent,
  splitVoicevoxPhrase,
  type VoicevoxAudioQuery,
} from "../voicevox-analysis";

function mora(text: string) {
  return { text, vowel: text, vowel_length: 0.1, pitch: 5 };
}

describe("voicevox analysis", () => {
  it("updates accent and serializes valid json", () => {
    const query = parseVoicevoxAnalysis(
      JSON.stringify({ accent_phrases: [{ moras: [mora("ア"), mora("イ")], accent: 1 }] }),
    );

    setVoicevoxAccent(query, 0, 1);

    expect(JSON.parse(serializeVoicevoxAnalysis(query))).toMatchObject({
      accent_phrases: [{ accent: 2 }],
    });
  });

  it("merges and splits existing phrase boundaries", () => {
    const query: VoicevoxAudioQuery = {
      accent_phrases: [
        { moras: [mora("ア")], accent: 1 },
        { moras: [mora("イ"), mora("ウ")], accent: 1 },
      ],
    };
    const cloned = cloneVoicevoxAudioQuery(query);
    const offset = mergeVoicevoxPhrases(cloned, 0);

    expect(offset).toBe(1);
    expect(cloned.accent_phrases).toHaveLength(1);
    expect(cloned.accent_phrases[0]?.moras.map((item) => item.text)).toEqual(["ア", "イ", "ウ"]);

    splitVoicevoxPhrase(cloned, 0, offset!);

    expect(cloned.accent_phrases).toHaveLength(2);
    expect(cloned.accent_phrases[1]?.moras.map((item) => item.text)).toEqual(["イ", "ウ"]);
  });
});

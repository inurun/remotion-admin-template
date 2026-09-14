import { describe, expect, it } from "vitest";
import {
  analyzeItemSchema,
  dictionaryWordsForLlm,
  storedG2pItemSchema,
  withLlmDictionaryWords,
  withoutStaleDictionaryWords,
} from "@/_schemas";
import {
  createSavedMainPage,
  createSavedTts,
} from "@/app/features/editor/store/__tests__/fixtures";
import { analyzeTexts } from "@/server/features/haqumei-api/analyze";
import { getHaqumeiApiUrl } from "@/server/features/haqumei-api/client";
import { buildVoicevoxSynthesisRequest } from "@/server/features/haqumei-api/synthesis-settings";
import { validateG2pItems } from "@/server/features/haqumei-api/validate";
import {
  buildAutomaticG2pContext,
  contextForChunk,
} from "@/server/features/tts/automatic-g2p-context";
import { toRepairItem } from "@/server/features/tts/g2p-correction";
import { getUsableG2p } from "@/server/features/tts/providers/comparison";

const serverEnv = {};
const apiUrl = getHaqumeiApiUrl(serverEnv);

async function haqumeiLive() {
  try {
    const response = await fetch(new URL("/health/live", `${apiUrl}/`), {
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

const live = await haqumeiLive();

describe.skipIf(!live)("live dictionary provenance", () => {
  it("keeps 雨衣 Analyze metadata through save, automatic pages, manual items, and repair", async () => {
    const [amekoro, greeting] = await analyzeTexts(serverEnv, ["雨衣", "こんにちは"]);
    expect(analyzeItemSchema.parse(amekoro)).toMatchObject({
      text: "雨衣",
      kana: "アメコロ'",
      dictionary_words: [{ word_index: 0, kind: "fixed" }],
    });
    expect(analyzeItemSchema.parse(greeting).dictionary_words).toEqual([]);

    const stored = storedG2pItemSchema.parse(amekoro);
    expect(getUsableG2p(stored, "雨衣")).toEqual(stored);
    expect(withoutStaleDictionaryWords(stored, undefined)).toEqual(stored);
    expect(withoutStaleDictionaryWords({ ...stored, kana: "ウイ'" }, stored)).toEqual({
      text: "雨衣",
      kana: "ウイ'",
      warnings: [],
    });

    const pages = [
      createSavedMainPage({
        id: "page-1",
        title: "Main",
        tts: [
          createSavedTts({
            id: "tts-amekoro",
            text: "雨衣",
            readText: "雨衣",
            speech: { g2p: stored },
            audio: { status: "analyzing", analysisKey: "key-1" },
          }),
          createSavedTts({
            id: "tts-hello",
            text: "こんにちは",
            readText: "こんにちは",
            speech: { g2p: greeting },
          }),
        ],
      }),
    ];
    const dictionaryWords = dictionaryWordsForLlm(stored.dictionary_words);
    const context = buildAutomaticG2pContext(pages, [
      {
        pageId: "page-1",
        ttsId: "tts-amekoro",
        baselineKana: stored.kana,
        ...(dictionaryWords ? { dictionaryWords } : {}),
      },
    ]);
    expect(context[0]?.utterances).toEqual([
      {
        id: "tts-amekoro",
        text: "雨衣",
        readText: "雨衣",
        baselineKana: "アメコロ'",
        dictionaryWords: [{ word_index: 0, kind: "fixed" }],
        target: true,
      },
      {
        id: "tts-hello",
        text: "こんにちは",
        readText: "こんにちは",
        target: false,
      },
    ]);
    expect(contextForChunk(context, new Set(["tts-amekoro"]))[0]?.utterances[1]).toEqual({
      id: "tts-hello",
      text: "こんにちは",
      readText: "こんにちは",
      target: false,
    });

    const promptItem = withLlmDictionaryWords(
      {
        id: "tts-amekoro",
        text: "雨衣",
        readText: "雨衣",
        kana: stored.kana,
      },
      stored.dictionary_words,
    );
    expect(promptItem.dictionaryWords).toEqual([{ word_index: 0, kind: "fixed" }]);
    expect(
      toRepairItem(promptItem, "ウイ'", [{ kind: "syntax", message: "missing accent nucleus" }]),
    ).toMatchObject({
      baselineKana: "アメコロ'",
      previousKana: "ウイ'",
      dictionaryWords: [{ word_index: 0, kind: "fixed" }],
    });

    expect(buildVoicevoxSynthesisRequest({ item: stored, speaker: 3 }).item).toEqual({
      text: "雨衣",
      kana: "アメコロ'",
      warnings: [],
    });
    const validated = await validateG2pItems(serverEnv, [{ text: stored.text, kana: stored.kana }]);
    expect(validated[0]).toEqual({
      text: "雨衣",
      kana: "アメコロ'",
      warnings: [],
    });
    expect(validated[0]).not.toHaveProperty("dictionary_words");
  });
});

import { describe, expect, it } from "vitest";
import { buildAutomaticG2pContext, contextForChunk } from "../automatic-g2p-context";
import {
  createSavedMainPage,
  createSavedTts,
} from "@/app/features/editor/store/__tests__/fixtures";

describe("automatic G2P context", () => {
  it("includes every TTS on pages that have a target and skips adjacent pages", () => {
    const pages = [
      createSavedMainPage({
        id: "page-prev",
        title: "Prev",
        tts: [createSavedTts({ id: "tts-prev", text: "前" })],
      }),
      createSavedMainPage({
        id: "page-1",
        title: "Main",
        tts: [
          createSavedTts({ id: "tts-1", text: "対象", readText: "対象" }),
          createSavedTts({ id: "tts-2", text: "peak", readText: "peak" }),
        ],
      }),
    ];

    expect(
      buildAutomaticG2pContext(pages, [
        { pageId: "page-1", ttsId: "tts-1", baselineKana: "タイショウ'" },
      ]),
    ).toEqual([
      {
        id: "page-1",
        title: "Main",
        utterances: [
          {
            id: "tts-1",
            text: "対象",
            readText: "対象",
            baselineKana: "タイショウ'",
            target: true,
          },
          {
            id: "tts-2",
            text: "peak",
            readText: "peak",
            target: false,
          },
        ],
      },
    ]);
  });

  it("keeps page context and marks only the chunk as target", () => {
    const pages = buildAutomaticG2pContext(
      [
        createSavedMainPage({
          id: "page-1",
          title: "Main",
          tts: [
            createSavedTts({ id: "tts-1", text: "一", readText: "一" }),
            createSavedTts({ id: "tts-2", text: "二", readText: "二" }),
            createSavedTts({ id: "tts-3", text: "三", readText: "三" }),
          ],
        }),
      ],
      [
        { pageId: "page-1", ttsId: "tts-1", baselineKana: "イチ'" },
        { pageId: "page-1", ttsId: "tts-2", baselineKana: "ニ'" },
      ],
    );

    expect(contextForChunk(pages, new Set(["tts-2"]))).toEqual([
      {
        id: "page-1",
        title: "Main",
        utterances: [
          { id: "tts-1", text: "一", readText: "一", target: false },
          {
            id: "tts-2",
            text: "二",
            readText: "二",
            baselineKana: "ニ'",
            target: true,
          },
          { id: "tts-3", text: "三", readText: "三", target: false },
        ],
      },
    ]);
  });

  it("adds dictionaryWords only to target utterances", () => {
    const dictionaryWords = [{ word_index: 0, kind: "fixed" as const }];
    const pages = [
      createSavedMainPage({
        id: "page-1",
        title: "Main",
        tts: [
          createSavedTts({ id: "tts-1", text: "雨衣", readText: "雨衣" }),
          createSavedTts({ id: "tts-2", text: "peak", readText: "peak" }),
        ],
      }),
    ];

    expect(
      buildAutomaticG2pContext(pages, [
        {
          pageId: "page-1",
          ttsId: "tts-1",
          baselineKana: "アメコロ'",
          dictionaryWords,
        },
      ]),
    ).toEqual([
      {
        id: "page-1",
        title: "Main",
        utterances: [
          {
            id: "tts-1",
            text: "雨衣",
            readText: "雨衣",
            baselineKana: "アメコロ'",
            dictionaryWords,
            target: true,
          },
          {
            id: "tts-2",
            text: "peak",
            readText: "peak",
            target: false,
          },
        ],
      },
    ]);

    expect(
      contextForChunk(
        buildAutomaticG2pContext(pages, [
          {
            pageId: "page-1",
            ttsId: "tts-1",
            baselineKana: "アメコロ'",
            dictionaryWords,
          },
          { pageId: "page-1", ttsId: "tts-2", baselineKana: "ピーク'" },
        ]),
        new Set(["tts-2"]),
      )[0]?.utterances,
    ).toEqual([
      { id: "tts-1", text: "雨衣", readText: "雨衣", target: false },
      {
        id: "tts-2",
        text: "peak",
        readText: "peak",
        baselineKana: "ピーク'",
        target: true,
      },
    ]);
  });
});

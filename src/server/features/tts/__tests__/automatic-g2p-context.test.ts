import { describe, expect, it } from "vitest";
import { buildAutomaticG2pContext } from "../automatic-g2p-context";
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
            baselinePhrases: [
              {
                leadingWords: [],
                accentedWord: { beforeNucleus: "タイショウ", afterNucleus: "" },
                trailingWords: [],
                boundaryAfter: "",
              },
            ],
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
});

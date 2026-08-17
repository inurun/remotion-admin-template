import { describe, expect, it } from "vitest";
import {
  mergeSavedSpeechIntoPageForm,
  toPageFormValues,
  toTtsFormValues,
} from "@/app/features/editor/lib/project-form-conversion";
import {
  createSavedMainPage,
  createSavedTts,
} from "@/app/features/editor/store/__tests__/fixtures";
import { createG2pItem } from "@/_schemas/__tests__/g2p-fixture";

describe("page form values", () => {
  it("converts only the selected saved page into page form values", () => {
    const page = createSavedMainPage({
      id: "page-a",
      title: "A",
      tts: [createSavedTts({ id: "tts-a", text: "Hello" })],
    });

    expect(toPageFormValues(page)).toEqual({
      id: "page-a",
      title: "A",
      type: "main",
      meta: { tags: [] },
      padBeforeSec: 0,
      padAfterSec: 0,
      richText: "<p>Hello</p>",
      tts: [toTtsFormValues(page.tts[0]!)],
    });
    expect(toPageFormValues(page)).not.toHaveProperty("durationSec");
    expect(toPageFormValues(page).tts[0]).not.toHaveProperty("audio");
  });

  it("merges saved speech onto matching TTS ids without using index or persistence fields", () => {
    const first = createG2pItem("first");
    const second = createG2pItem("second");
    const current = toPageFormValues(
      createSavedMainPage({
        tts: [
          createSavedTts({ id: "tts-b", text: "B" }),
          createSavedTts({ id: "tts-a", text: "A" }),
        ],
      }),
    );
    const saved = toPageFormValues(
      createSavedMainPage({
        tts: [
          createSavedTts({ id: "tts-a", text: "A", speech: { g2p: first } }),
          createSavedTts({ id: "tts-b", text: "B", speech: { g2p: second } }),
        ],
      }),
    );

    const merged = mergeSavedSpeechIntoPageForm(current, saved);
    expect(merged.tts.map((item) => item.id)).toEqual(["tts-b", "tts-a"]);
    expect(merged.tts[0]?.speech?.g2p).toBe(second);
    expect(merged.tts[1]?.speech?.g2p).toBe(first);
    expect(merged).not.toHaveProperty("durationSec");
    expect(merged.tts[0]).not.toHaveProperty("audio");
  });
});

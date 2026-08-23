import { describe, expect, it } from "vitest";
import type { DictionaryEntry, DictionaryEntryInput } from "@/_schemas";
import {
  filterDictionaryEntries,
  pickEntryForKind,
  shouldReplaceDraftForKind,
} from "@/app/components/app-dictionary/use-app-dictionary";

const word = (id: number, surface: string): DictionaryEntry => ({
  id,
  kind: "fixed",
  surface,
  reading: "ア",
  pronunciation: null,
  accent_nucleus: 0,
  part_of_speech: "proper_noun",
  enabled: true,
});

const context = (id: number, surface: string): DictionaryEntry => ({
  id,
  kind: "contextual",
  surface,
  enabled: true,
  candidates: [
    {
      description: "a",
      examples: ["a"],
      morphemes: [
        {
          surface,
          reading: "ア",
          pronunciation: null,
          accent_nucleus: 0,
          part_of_speech: "proper_noun",
        },
      ],
    },
    {
      description: "b",
      examples: ["b"],
      morphemes: [
        {
          surface,
          reading: "イ",
          pronunciation: null,
          accent_nucleus: 0,
          part_of_speech: "proper_noun",
        },
      ],
    },
  ],
});

const entries = [word(1, "雨"), context(2, "辛い"), word(3, "雨衣")];

describe("dictionary tab helpers", () => {
  it("keeps entries on the active kind and search needle", () => {
    expect(filterDictionaryEntries(entries, "fixed", "").map((entry) => entry.id)).toEqual([1, 3]);
    expect(filterDictionaryEntries(entries, "contextual", "").map((entry) => entry.id)).toEqual([
      2,
    ]);
    expect(filterDictionaryEntries(entries, "fixed", "衣").map((entry) => entry.id)).toEqual([3]);
  });

  it("picks the first entry of the tab kind", () => {
    expect(pickEntryForKind(entries, "fixed")?.id).toBe(1);
    expect(pickEntryForKind(entries, "contextual")?.id).toBe(2);
    expect(pickEntryForKind([], "fixed")).toBeNull();
  });

  it("replaces a draft when switching to another kind", () => {
    const draft: DictionaryEntryInput = {
      kind: "fixed",
      surface: "雨",
      reading: "アメ",
      pronunciation: null,
      accent_nucleus: 0,
      part_of_speech: "proper_noun",
      enabled: true,
    };
    expect(shouldReplaceDraftForKind(null, "fixed")).toBe(true);
    expect(shouldReplaceDraftForKind(draft, "fixed")).toBe(false);
    expect(shouldReplaceDraftForKind(draft, "contextual")).toBe(true);
  });
});

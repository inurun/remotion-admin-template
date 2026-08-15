import type { DraftTts } from "@/_schemas";

export function applyTtsTextChange(item: DraftTts, nextText: string): DraftTts {
  return {
    ...item,
    text: nextText,
    readText: nextText,
  };
}

import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";

export type AdjacentTtsContextItem = {
  text: string;
  readText?: string;
};

export type AdjacentTtsContext = {
  previous?: AdjacentTtsContextItem;
  next?: AdjacentTtsContextItem;
};

function hasContextText(item: Pick<TtsFormValues, "text" | "readText">) {
  return Boolean(item.readText?.trim() || item.text.trim());
}

function toContextItem(item: TtsFormValues): AdjacentTtsContextItem {
  return item.readText === undefined
    ? { text: item.text }
    : { text: item.text, readText: item.readText };
}

export function getAdjacentTtsContext(items: TtsFormValues[], ttsId: string): AdjacentTtsContext {
  const index = items.findIndex((item) => item.id === ttsId);
  if (index < 0) {
    return {};
  }

  const previous = items[index - 1];
  const next = items[index + 1];
  return {
    ...(previous && hasContextText(previous) ? { previous: toContextItem(previous) } : {}),
    ...(next && hasContextText(next) ? { next: toContextItem(next) } : {}),
  };
}

import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";

export function applyTtsTextChange(item: TtsFormValues, nextText: string): TtsFormValues {
  return {
    ...item,
    text: nextText,
    readText: nextText,
  };
}

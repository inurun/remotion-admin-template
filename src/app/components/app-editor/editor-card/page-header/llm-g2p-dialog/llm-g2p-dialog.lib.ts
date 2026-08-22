import type { TtsLlmAnalysisResponse } from "@/server/features/tts/contract";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";

export function createLlmG2pSnapshot(pageId: string, items: TtsFormValues[]) {
  return JSON.stringify({
    pageId,
    items: items.map((item) => ({
      id: item.id,
      provider: item.provider,
      text: item.text,
      ...(item.readText === undefined ? {} : { readText: item.readText }),
    })),
  });
}

export function applyLlmG2pResults(
  items: TtsFormValues[],
  results: TtsLlmAnalysisResponse["items"],
) {
  const resultById = new Map(results.map((result) => [result.id, result]));
  return items.map((item) => {
    const result = resultById.get(item.id);
    if (!result?.g2p || result.status === "skipped") {
      return item;
    }
    return { ...item, speech: { ...item.speech, g2p: result.g2p } };
  });
}

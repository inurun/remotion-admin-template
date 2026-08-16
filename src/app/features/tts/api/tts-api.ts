import type { DraftTts, G2pItem } from "@/_schemas";
import { api } from "@/_shared/lib/api-client";
import { parseApiJson } from "@/_shared/lib/fetch-json";
import { getPreviewPayload } from "@/app/features/tts/lib/tts-preview-payload";

function getTextForAnalysis(item: DraftTts) {
  return item.readText?.trim() || item.text;
}

export async function requestTextAnalysis(item: DraftTts) {
  const data = await parseApiJson<{ g2p: G2pItem }>(
    await api.tts.analyze.$post({ json: { text: getTextForAnalysis(item) } }),
  );

  if (!data.g2p) {
    throw new Error("Analyze failed");
  }

  return data.g2p;
}

export async function requestPreviewSynthesis(item: DraftTts, projectPath: string) {
  const data = await parseApiJson<{ audioSrc: string }>(
    await api.tts.synthesize.$post({
      json: getPreviewPayload(item, projectPath),
    }),
  );

  if (!data.audioSrc) {
    throw new Error("Preview failed");
  }

  return data.audioSrc;
}

export async function clearTtsCache(projectPath: string) {
  await parseApiJson<{ ok: true }>(
    await api.tts.cache.$delete({
      json: { projectPath },
    }),
  );
}

import type { DraftTts } from "@/_schemas";
import { api } from "@/_shared/lib/api-client";
import { parseApiJson } from "@/_shared/lib/fetch-json";
import { getPreviewPayload } from "@/app/features/tts/lib/tts-preview-payload";

type TextAnalysisPayload =
  | { provider: "voisona"; text: string; language?: string }
  | { provider: "voicevox"; text: string; voiceName: string }
  | { provider: "voicepeak"; text: string };

async function analyzeText(payload: TextAnalysisPayload) {
  return parseApiJson<{ analysis: string }>(await api.tts.analyze.$post({ json: payload }));
}

async function synthesize(payload: ReturnType<typeof getPreviewPayload>) {
  return parseApiJson<{ audioSrc: string }>(
    await api.tts.synthesize.$post({
      json: payload,
    }),
  );
}

function getTextForAnalysis(item: DraftTts) {
  return item.readText?.trim() || item.text;
}

function getVoisonaAnalysisPayload(item: Extract<DraftTts, { provider: "voisona" }>) {
  return {
    provider: item.provider,
    text: getTextForAnalysis(item),
    language: "ja_JP",
  } satisfies TextAnalysisPayload;
}

function getVoicevoxAnalysisPayload(item: Extract<DraftTts, { provider: "voicevox" }>) {
  return {
    provider: item.provider,
    text: getTextForAnalysis(item),
    voiceName: item.voiceName ?? "",
  } satisfies TextAnalysisPayload;
}

function getVoicepeakAnalysisPayload(item: Extract<DraftTts, { provider: "voicepeak" }>) {
  return {
    provider: item.provider,
    text: getTextForAnalysis(item),
  } satisfies TextAnalysisPayload;
}

function getTextAnalysisPayload(item: DraftTts): TextAnalysisPayload {
  if (item.provider === "voisona") {
    return getVoisonaAnalysisPayload(item);
  }
  if (item.provider === "voicevox") {
    return getVoicevoxAnalysisPayload(item);
  }
  return getVoicepeakAnalysisPayload(item);
}

export async function requestTextAnalysis(item: DraftTts) {
  const data = await analyzeText(getTextAnalysisPayload(item));

  if (!data.analysis) {
    throw new Error("Analyze failed");
  }

  return data.analysis;
}

export async function requestPreviewSynthesis(item: DraftTts, projectPath: string) {
  const data = await synthesize(getPreviewPayload(item, projectPath));

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

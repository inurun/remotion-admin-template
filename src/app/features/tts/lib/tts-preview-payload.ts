import type { DraftTts } from "@/_schemas";

export type PreviewSynthesisPayload = {
  provider: DraftTts["provider"];
  projectPath: string;
  analysis?: string;
  text: string;
  voiceName: string;
  voiceVersion?: string;
  synthesisSettings?: NonNullable<DraftTts["synthesisSettings"]>;
};

function getTextForSynthesis(item: DraftTts) {
  return item.readText?.trim() || item.text;
}

function getRequiredVoiceName(item: DraftTts) {
  const voiceName = item.voiceName?.trim();
  if (!voiceName) {
    throw new Error("Voice name is required");
  }
  return voiceName;
}

function getAnalysisPart(item: DraftTts) {
  const analysis = item.speech?.analysis?.trim();
  return analysis ? { analysis } : {};
}

function getVoiceVersionPart(item: DraftTts) {
  const voiceVersion = item.voiceVersion?.trim();
  return voiceVersion ? { voiceVersion } : {};
}

export function getPreviewPayload(item: DraftTts, projectPath: string): PreviewSynthesisPayload {
  return {
    provider: item.provider,
    projectPath,
    text: getTextForSynthesis(item),
    ...getAnalysisPart(item),
    voiceName: getRequiredVoiceName(item),
    ...getVoiceVersionPart(item),
    ...(item.synthesisSettings ? { synthesisSettings: item.synthesisSettings } : {}),
  };
}

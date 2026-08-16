import type { DraftTts, G2pItem } from "@/_schemas";

export type PreviewSynthesisPayload = {
  provider: DraftTts["provider"];
  projectPath: string;
  g2p?: G2pItem;
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

function getG2pPart(item: DraftTts) {
  return item.speech?.g2p ? { g2p: item.speech.g2p } : {};
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
    ...getG2pPart(item),
    voiceName: getRequiredVoiceName(item),
    ...getVoiceVersionPart(item),
    ...(item.synthesisSettings ? { synthesisSettings: item.synthesisSettings } : {}),
  };
}

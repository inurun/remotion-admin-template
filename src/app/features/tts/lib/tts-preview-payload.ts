import type { G2pItem } from "@/_schemas";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";

export type PreviewSynthesisPayload = {
  provider: TtsFormValues["provider"];
  projectPath: string;
  g2p?: G2pItem;
  text: string;
  voiceName: string;
  voiceVersion?: string;
  synthesisSettings?: NonNullable<TtsFormValues["synthesisSettings"]>;
};

function getTextForSynthesis(item: TtsFormValues) {
  return item.readText?.trim() || item.text;
}

function getRequiredVoiceName(item: TtsFormValues) {
  const voiceName = item.voiceName?.trim();
  if (!voiceName) {
    throw new Error("Voice name is required");
  }
  return voiceName;
}

function getG2pPart(item: TtsFormValues) {
  return item.speech?.g2p ? { g2p: item.speech.g2p } : {};
}

function getVoiceVersionPart(item: TtsFormValues) {
  const voiceVersion = item.voiceVersion?.trim();
  return voiceVersion ? { voiceVersion } : {};
}

export function getPreviewPayload(
  item: TtsFormValues,
  projectPath: string,
): PreviewSynthesisPayload {
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

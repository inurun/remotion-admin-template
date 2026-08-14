import type { DraftTts, VoiceOption } from "@/_schemas";
import { createUuid } from "@/_shared/lib/utils";

const emptyVoice = {
  provider: "voisona" as const,
  voiceName: "",
  voiceVersion: "",
};

function hasVoiceName(voice: DraftTts | VoiceOption | undefined) {
  return Boolean(voice?.voiceName);
}

function getInitialVoice(options: VoiceOption[], sourceTts: DraftTts | undefined) {
  const voice = [sourceTts, options[0]].find(hasVoiceName) ?? emptyVoice;
  return {
    provider: voice.provider,
    voiceName: voice.voiceName,
    voiceVersion: voice.voiceVersion ?? "",
  };
}

export function createDraftTts(options: VoiceOption[], sourceTts: DraftTts | undefined): DraftTts {
  const voice = getInitialVoice(options, sourceTts);

  return {
    id: createUuid(),
    provider: voice.provider,
    text: "",
    readText: "",
    voiceName: voice.voiceName,
    voiceVersion: voice.voiceVersion,
    padBeforeSec: 0,
    padAfterSec: 0,
    volume: 1,
    synthesisSettings: null,
    ...(sourceTts?.avatar ? { avatar: sourceTts.avatar } : {}),
    speech: { analysis: "" },
  };
}

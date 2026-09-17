import { hasVoiceIdentity, type VoiceOption } from "@/_schemas";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import { applyTtsVoiceChange } from "@/app/features/tts/lib/apply-tts-voice-change";

function emptyDraft(id: string, avatar: TtsFormValues["avatar"]): TtsFormValues {
  return {
    id,
    provider: "voisona",
    text: "",
    readText: "",
    voiceName: "",
    voiceVersion: "",
    padBeforeSec: 0,
    padAfterSec: 0,
    volume: 1,
    synthesisSettings: null,
    speech: {},
    ...(avatar ? { avatar } : {}),
  };
}

export function createTtsInput(
  options: VoiceOption[],
  sourceTts: TtsFormValues | undefined,
): TtsFormValues {
  const draft = emptyDraft(crypto.randomUUID(), sourceTts?.avatar);

  if (sourceTts && hasVoiceIdentity(sourceTts)) {
    if (sourceTts.provider === "coeiroink") {
      return {
        id: draft.id,
        provider: "coeiroink",
        text: "",
        readText: "",
        speakerUuid: sourceTts.speakerUuid,
        styleId: sourceTts.styleId,
        modelVersion: sourceTts.modelVersion,
        padBeforeSec: 0,
        padAfterSec: 0,
        volume: 1,
        synthesisSettings: null,
        speech: {},
        ...(sourceTts.avatar ? { avatar: sourceTts.avatar } : {}),
      };
    }

    return {
      id: draft.id,
      provider: sourceTts.provider,
      text: "",
      readText: "",
      voiceName: sourceTts.voiceName,
      voiceVersion: sourceTts.voiceVersion ?? "",
      padBeforeSec: 0,
      padAfterSec: 0,
      volume: 1,
      synthesisSettings: null,
      speech: {},
      ...(sourceTts.avatar ? { avatar: sourceTts.avatar } : {}),
    };
  }

  const catalogVoice = options.find((voice) => hasVoiceIdentity(voice));
  if (!catalogVoice) {
    return draft;
  }

  const next = applyTtsVoiceChange(draft, catalogVoice);
  if (sourceTts?.avatar) {
    return {
      ...next,
      avatar: sourceTts.avatar,
      text: "",
      readText: "",
      synthesisSettings: null,
      speech: {},
    };
  }
  return { ...next, text: "", readText: "", synthesisSettings: null, speech: {} };
}

import type { DraftProject, DraftTts, VoiceOption, VoicePreset } from "@/_schemas";

export {
  DEFAULT_KASANE_TETO_EMOTION,
  DEFAULT_VOICEPEAK_PITCH,
  DEFAULT_VOICEPEAK_SPEED,
  getDefaultVoicePresets,
  KASANE_TETO_NARRATOR,
} from "@/_shared/project/default-voice-presets";

function isEmptySettings(value: DraftTts["synthesisSettings"]) {
  return !value || Object.keys(value).length === 0;
}

function getConcreteSynthesisSettings(value: DraftTts["synthesisSettings"]) {
  return isEmptySettings(value) ? undefined : value;
}

function matchesVoice(
  preset: VoicePreset,
  voice: Pick<VoiceOption, "provider" | "voiceName" | "voiceVersion">,
) {
  return preset.provider === voice.provider && preset.voiceName === voice.voiceName;
}

function findVoicePresetIndex(
  presets: VoicePreset[],
  voice: Pick<VoiceOption, "provider" | "voiceName" | "voiceVersion">,
) {
  const matches = presets.flatMap((preset, index) =>
    matchesVoice(preset, voice) ? [{ preset, index }] : [],
  );
  if (matches.length === 0) {
    return -1;
  }

  const version = voice.voiceVersion?.trim();
  if (version) {
    return matches.find((item) => item.preset.voiceVersion === version)?.index ?? matches[0].index;
  }

  return matches.find((item) => !item.preset.voiceVersion)?.index ?? matches[0].index;
}

function findVoicePreset(
  presets: VoicePreset[],
  voice: Pick<VoiceOption, "provider" | "voiceName" | "voiceVersion">,
) {
  const index = findVoicePresetIndex(presets, voice);
  return index === -1 ? undefined : presets[index];
}

export function getVoicePresetSettings(
  presets: VoicePreset[],
  voice: Pick<VoiceOption, "provider" | "voiceName" | "voiceVersion">,
) {
  return findVoicePreset(presets, voice)?.synthesisSettings;
}

export function upsertVoicePreset(
  presets: VoicePreset[],
  voice: Pick<VoiceOption, "provider" | "voiceName" | "voiceVersion">,
  synthesisSettings: DraftTts["synthesisSettings"] | undefined,
): VoicePreset[] {
  const existingIndex = findVoicePresetIndex(presets, voice);

  if (!getConcreteSynthesisSettings(synthesisSettings)) {
    if (existingIndex === -1) {
      return presets;
    }
    return presets.filter((_, itemIndex) => itemIndex !== existingIndex);
  }

  const nextPreset = {
    provider: voice.provider,
    voiceName: voice.voiceName,
    ...(voice.voiceVersion ? { voiceVersion: voice.voiceVersion } : {}),
    synthesisSettings,
  } as VoicePreset;

  if (existingIndex === -1) {
    return [...presets, nextPreset];
  }

  return presets.map((preset, itemIndex) => (itemIndex === existingIndex ? nextPreset : preset));
}

function getTtsPresetSettings(item: DraftTts, presets: VoicePreset[]) {
  return getVoicePresetSettings(presets, {
    provider: item.provider,
    voiceName: item.voiceName ?? "",
    voiceVersion: item.voiceVersion ?? "",
  });
}

export function resolveTtsSynthesisSettings(item: DraftTts, presets: VoicePreset[]): DraftTts {
  const synthesisSettings =
    getConcreteSynthesisSettings(item.synthesisSettings) ??
    getConcreteSynthesisSettings(getTtsPresetSettings(item, presets));
  return {
    ...item,
    ...(synthesisSettings ? { synthesisSettings } : { synthesisSettings: undefined }),
  } as DraftTts;
}

export function resolveProjectSynthesisSettings(project: DraftProject): DraftProject {
  return {
    ...project,
    pages: project.pages.map((page) => {
      if (page.type === "transition") {
        return page;
      }

      return {
        ...page,
        tts: page.tts.map((item) => resolveTtsSynthesisSettings(item, project.voicePresets)),
      };
    }),
  };
}

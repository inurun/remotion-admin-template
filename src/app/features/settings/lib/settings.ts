import type { DraftProject, DraftTts, VoiceOption } from "@/_schemas";
import { getVoiceId } from "@/app/features/settings/lib/voice-id";
import type { VoiceSettings } from "@/app/features/settings/storage/use-settings-store";

export function mergeVoiceOrder(currentOrder: string[], voices: VoiceOption[]) {
  const nextVoiceIds = new Set(voices.map(getVoiceId));
  return currentOrder.filter((voiceId) => nextVoiceIds.has(voiceId));
}

export function getVisibleVoiceOptions({
  voiceOrder,
  voiceSettings,
  voices,
}: {
  voiceOrder: string[];
  voiceSettings: Record<string, VoiceSettings>;
  voices: VoiceOption[];
}) {
  const voicesById = new Map(voices.map((voice) => [getVoiceId(voice), voice]));
  const sortedIds = mergeVoiceOrder(voiceOrder, voices);

  return sortedIds.flatMap((voiceId) => {
    const voice = voicesById.get(voiceId);
    if (!voice) {
      return [];
    }

    const customLabel = voiceSettings[voiceId]?.label?.trim();
    if (!customLabel) {
      return [];
    }

    return [
      {
        ...voice,
        displayName: customLabel,
      },
    ];
  });
}

export function getDefaultVoice(options: VoiceOption[]) {
  return options[0] ?? null;
}

export function getVoicePresetSettings(
  voiceSettings: Record<string, VoiceSettings>,
  voice: Pick<VoiceOption, "provider" | "voiceName" | "voiceVersion">,
) {
  return voiceSettings[getVoiceId(voice)]?.synthesisSettings ?? undefined;
}

function isEmptySettings(value: DraftTts["synthesisSettings"]) {
  return !value || Object.keys(value).length === 0;
}

function getConcreteSynthesisSettings(value: DraftTts["synthesisSettings"]) {
  return isEmptySettings(value) ? undefined : value;
}

function getTtsPresetSettings(item: DraftTts, voiceSettings: Record<string, VoiceSettings>) {
  return getVoicePresetSettings(voiceSettings, {
    provider: item.provider,
    voiceName: item.voiceName ?? "",
    voiceVersion: item.voiceVersion ?? "",
  });
}

function getResolvedTtsSynthesisSettings(
  item: DraftTts,
  voiceSettings: Record<string, VoiceSettings>,
) {
  return (
    getConcreteSynthesisSettings(item.synthesisSettings) ??
    getConcreteSynthesisSettings(getTtsPresetSettings(item, voiceSettings))
  );
}

export function resolveTtsSynthesisSettings(
  item: DraftTts,
  voiceSettings: Record<string, VoiceSettings>,
): DraftTts {
  const synthesisSettings = getResolvedTtsSynthesisSettings(item, voiceSettings);
  return {
    ...item,
    ...(synthesisSettings ? { synthesisSettings } : { synthesisSettings: undefined }),
  } as DraftTts;
}

export function resolveProjectSynthesisSettings(
  project: DraftProject,
  voiceSettings: Record<string, VoiceSettings>,
): DraftProject {
  return {
    ...project,
    pages: project.pages.map((page) => {
      if (page.type === "transition") {
        return page;
      }

      return {
        ...page,
        tts: page.tts.map((item) => resolveTtsSynthesisSettings(item, voiceSettings)),
      };
    }),
  };
}

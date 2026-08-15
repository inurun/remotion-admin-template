import type { VoiceOption } from "@/_schemas";
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

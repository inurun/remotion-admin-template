import type { VoiceOption } from "@/_schemas";
import { getVoiceId, getVoiceMatchKey, parseVoiceId } from "@/app/features/settings/lib/voice-id";

type VoiceSettings = {
  label: string;
  alias: string;
  hotkey: string;
};

export function mergeVoiceOrder(currentOrder: string[], voices: VoiceOption[]) {
  const nextVoiceIds = new Set(voices.map(getVoiceId));
  return currentOrder.filter((voiceId) => nextVoiceIds.has(voiceId));
}

function pickCatalogVoice(
  voiceId: string,
  catalogById: Map<string, VoiceOption>,
  catalogByMatchKey: Map<string, VoiceOption[]>,
) {
  const exact = catalogById.get(voiceId);
  if (exact) {
    return exact;
  }

  const parsed = parseVoiceId(voiceId);
  if (!parsed) {
    return undefined;
  }

  const candidates = catalogByMatchKey.get(getVoiceMatchKey(parsed)) ?? [];
  if (parsed.voiceVersion) {
    const versionMatch = candidates.find(
      (voice) => (voice.voiceVersion ?? "") === parsed.voiceVersion,
    );
    if (versionMatch) {
      return versionMatch;
    }
  }

  return candidates[0];
}

export function mergeCatalogVoices({
  catalog,
  selectedVoices,
  voiceOrder,
  voiceSettings,
}: {
  catalog: VoiceOption[];
  selectedVoices: VoiceOption[];
  voiceOrder: string[];
  voiceSettings: Record<string, VoiceSettings>;
}) {
  const catalogById = new Map(catalog.map((voice) => [getVoiceId(voice), voice]));
  const catalogByMatchKey = new Map<string, VoiceOption[]>();
  for (const voice of catalog) {
    const matchKey = getVoiceMatchKey(voice);
    const current = catalogByMatchKey.get(matchKey) ?? [];
    current.push(voice);
    catalogByMatchKey.set(matchKey, current);
  }

  const remapId = (voiceId: string) => {
    const catalogVoice = pickCatalogVoice(voiceId, catalogById, catalogByMatchKey);
    return catalogVoice ? getVoiceId(catalogVoice) : voiceId;
  };

  const remappedOrder: string[] = [];
  const seenIds = new Set<string>();
  for (const voiceId of voiceOrder) {
    const nextId = remapId(voiceId);
    if (seenIds.has(nextId)) {
      continue;
    }
    seenIds.add(nextId);
    remappedOrder.push(nextId);
  }

  const selectedById = new Map(selectedVoices.map((voice) => [getVoiceId(voice), voice]));
  const kept = remappedOrder.flatMap((voiceId) => {
    if (catalogById.has(voiceId)) {
      return [];
    }
    const stub = selectedById.get(voiceId);
    return stub ? [stub] : [];
  });

  const voices = [...catalog, ...kept];
  const nextSettings: Record<string, VoiceSettings> = {};
  for (const [voiceId, value] of Object.entries(voiceSettings)) {
    nextSettings[remapId(voiceId)] = value;
  }

  return {
    voices,
    voiceOrder: mergeVoiceOrder(remappedOrder, voices),
    voiceSettings: nextSettings,
  };
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

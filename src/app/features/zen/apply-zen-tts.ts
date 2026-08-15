import type { DraftTts } from "@/_schemas";
import { getVoiceId } from "@/app/features/settings";
import { applyTtsTextChange } from "@/app/features/tts/lib/apply-tts-text-change";
import { applyTtsVoiceChange } from "@/app/features/tts/lib/apply-tts-voice-change";
import { createVoiceAliasMap } from "@/app/features/zen/create-alias-map";
import type { ZenAliasTarget } from "@/app/features/zen/types";

function ttsAlias(item: DraftTts, voiceAliases: Map<string, string>) {
  return (
    voiceAliases.get(
      getVoiceId({
        provider: item.provider,
        voiceName: item.voiceName ?? "",
        voiceVersion: item.voiceVersion,
      }),
    ) ?? ""
  );
}

function isSameTtsKey(left: DraftTts, right: DraftTts, voiceAliases: Map<string, string>) {
  return ttsAlias(left, voiceAliases) === ttsAlias(right, voiceAliases) && left.text === right.text;
}

function applyEyes(existing: DraftTts, next: DraftTts): DraftTts {
  const nextEyes = next.avatar?.eyes;
  if (!nextEyes || existing.avatar?.eyes === nextEyes) {
    return existing;
  }

  if (!existing.avatar) {
    return next.avatar ? { ...existing, avatar: next.avatar } : existing;
  }

  return {
    ...existing,
    avatar: {
      ...existing.avatar,
      eyes: nextEyes,
    },
  };
}

function applySubstitute(existing: DraftTts, next: DraftTts): DraftTts {
  let result = existing;
  const voiceChanged =
    existing.provider !== next.provider ||
    existing.voiceName !== next.voiceName ||
    (existing.voiceVersion ?? "") !== (next.voiceVersion ?? "");

  if (voiceChanged) {
    result = applyTtsVoiceChange(result, {
      provider: next.provider,
      voiceName: next.voiceName ?? "",
      voiceVersion: next.voiceVersion ?? "",
    });
  }

  if (result.text !== next.text) {
    result = applyTtsTextChange(result, next.text);
  }

  return applyEyes(result, next);
}

export function applyZenTtsList(
  existing: DraftTts[],
  next: DraftTts[],
  aliases: Map<string, ZenAliasTarget>,
): DraftTts[] {
  const voiceAliases = createVoiceAliasMap(aliases);
  const usedOld = new Set<number>();
  const matchForNew: Array<number | null> = next.map(() => null);

  for (const [newIndex, incoming] of next.entries()) {
    const found = existing.findIndex(
      (item, oldIndex) => !usedOld.has(oldIndex) && isSameTtsKey(item, incoming, voiceAliases),
    );
    if (found < 0) {
      continue;
    }

    matchForNew[newIndex] = found;
    usedOld.add(found);
  }

  const unmatchedOld = existing
    .map((_, oldIndex) => oldIndex)
    .filter((oldIndex) => !usedOld.has(oldIndex));
  const unmatchedNew = matchForNew.flatMap((matched, newIndex) =>
    matched === null ? [newIndex] : [],
  );
  const substituteForNew = new Map<number, number>();
  const zipCount = Math.min(unmatchedOld.length, unmatchedNew.length);

  for (let offset = 0; offset < zipCount; offset += 1) {
    const newIndex = unmatchedNew[offset];
    const oldIndex = unmatchedOld[offset];
    if (newIndex === undefined || oldIndex === undefined) {
      continue;
    }
    substituteForNew.set(newIndex, oldIndex);
  }

  const result: DraftTts[] = [];
  for (const [newIndex, incoming] of next.entries()) {
    const matchedOldIndex = matchForNew[newIndex];
    if (matchedOldIndex !== null && matchedOldIndex !== undefined) {
      const current = existing[matchedOldIndex];
      if (current) {
        result.push(applyEyes(current, incoming));
      }
      continue;
    }

    const substitutedOldIndex = substituteForNew.get(newIndex);
    if (substitutedOldIndex !== undefined) {
      const current = existing[substitutedOldIndex];
      if (current) {
        result.push(applySubstitute(current, incoming));
      }
      continue;
    }

    result.push(incoming);
  }

  return result;
}

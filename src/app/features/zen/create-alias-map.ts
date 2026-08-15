import type { VoiceOption } from "@/_schemas";
import { getAvatarTypeByVoiceName } from "@/_shared/lib/avatar/avatar-settings";
import { getVoiceId } from "@/app/features/settings";
import type { VoiceSettings } from "@/app/features/settings/storage/use-settings-store";
import type { ZenAliasTarget, ZenParseError } from "@/app/features/zen/types";

export function createAliasMap(
  voices: VoiceOption[],
  voiceSettings: Record<string, VoiceSettings>,
): { aliases: Map<string, ZenAliasTarget>; errors: ZenParseError[] } {
  const voicesById = new Map(voices.map((voice) => [getVoiceId(voice), voice]));
  const aliases = new Map<string, ZenAliasTarget>();
  const errors: ZenParseError[] = [];
  const seen = new Map<string, string>();

  for (const [voiceId, settings] of Object.entries(voiceSettings)) {
    const alias = settings.alias?.trim();
    if (!alias) {
      continue;
    }

    const voice = voicesById.get(voiceId);
    if (!voice) {
      continue;
    }

    const existingVoiceId = seen.get(alias);
    if (existingVoiceId && existingVoiceId !== voiceId) {
      errors.push({
        line: 0,
        message: `Duplicate alias "${alias}".`,
      });
      continue;
    }

    seen.set(alias, voiceId);
    aliases.set(alias, {
      voice,
      avatarType: getAvatarTypeByVoiceName(voice.voiceName),
    });
  }

  return { aliases, errors };
}

export function createVoiceAliasMap(aliases: Map<string, ZenAliasTarget>) {
  const voiceAliases = new Map<string, string>();
  for (const [alias, target] of aliases) {
    voiceAliases.set(getVoiceId(target.voice), alias);
  }
  return voiceAliases;
}

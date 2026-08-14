import type { DraftPage, DraftTts, VoiceOption } from "@/_schemas";
import {
  getAvatarTypeByVoiceName,
  resolveAvatarSettings,
} from "@/_shared/lib/avatar/avatar-settings";
import { createUuid } from "@/_shared/lib/utils";
import { createBlankDraftPage } from "@/app/features/page";
import { createDraftTts } from "@/app/features/tts";
import type { ZenAliasTarget, ZenDraftPage, ZenSpeakerBlock } from "@/app/features/zen/types";

function createZenTts(
  options: VoiceOption[],
  target: ZenAliasTarget,
  text: string,
  eyes: string | undefined,
): DraftTts {
  const draft = createDraftTts(options, undefined);
  const avatarType = getAvatarTypeByVoiceName(target.voice.voiceName);
  const avatar = resolveAvatarSettings(
    avatarType,
    eyes ? { base: "", eyes, mouth: "" } : undefined,
  );

  return {
    ...draft,
    provider: target.voice.provider,
    voiceName: target.voice.voiceName,
    voiceVersion: target.voice.voiceVersion ?? "",
    text,
    readText: text,
    avatar,
    synthesisSettings: null,
  } as DraftTts;
}

function createSpeakerTtsList(
  speakers: ZenSpeakerBlock[],
  aliases: Map<string, ZenAliasTarget>,
  voiceOptions: VoiceOption[],
): DraftTts[] {
  const result: DraftTts[] = [];

  for (const speaker of speakers) {
    const target = aliases.get(speaker.alias);
    if (!target) {
      continue;
    }

    for (const line of speaker.lines) {
      result.push(createZenTts(voiceOptions, target, line, speaker.eyes));
    }
  }

  return result;
}

export function buildDraftPages(
  pages: ZenDraftPage[],
  aliases: Map<string, ZenAliasTarget>,
): DraftPage[] {
  const voiceOptions = [...aliases.values()].map((target) => target.voice);

  return pages.map((page) => {
    const draft = createBlankDraftPage({
      id: createUuid(),
      title: page.title,
      type: "main",
    });

    return {
      ...draft,
      type: "main" as const,
      meta: { tags: page.tags },
      tts: createSpeakerTtsList(page.speakers, aliases, voiceOptions),
    };
  });
}

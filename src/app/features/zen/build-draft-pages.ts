import type { DraftPage, DraftTts, VoiceOption } from "@/_schemas";
import { createUuid } from "@/_shared/lib/utils";
import { createBlankDraftPage } from "@/app/features/page";
import { createZenTts } from "@/app/features/zen/create-zen-tts";
import type { ZenAliasTarget, ZenDraftPage, ZenSpeakerBlock } from "@/app/features/zen/types";

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

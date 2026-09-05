import type { VoiceOption } from "@/_schemas";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import { createUuid } from "@/_shared/lib/utils";
import { createBlankPageInput } from "@/app/features/page";
import { createZenTts } from "@/app/features/zen/create-zen-tts";
import type { ZenAliasTarget, ZenDraftPage, ZenSpeakerBlock } from "@/app/features/zen/types";

function createSpeakerTtsList(
  speakers: ZenSpeakerBlock[],
  aliases: Map<string, ZenAliasTarget>,
  voiceOptions: VoiceOption[],
): TtsFormValues[] {
  const result: TtsFormValues[] = [];

  for (const speaker of speakers) {
    const target = aliases.get(speaker.alias);
    if (!target) {
      continue;
    }

    for (const line of speaker.lines) {
      result.push(createZenTts(voiceOptions, target, line, speaker.avatar));
    }
  }

  return result;
}

export function buildPageInputs(
  pages: ZenDraftPage[],
  aliases: Map<string, ZenAliasTarget>,
): PageFormValues[] {
  const voiceOptions = [...aliases.values()].map((target) => target.voice);

  return pages.map((page) => {
    const draft = createBlankPageInput({
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

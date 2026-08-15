import type { DraftPage } from "@/_schemas";
import { applyZenTtsList } from "@/app/features/zen/apply-zen-tts";
import type { ZenAliasTarget } from "@/app/features/zen/types";

export function applyZenPage(
  existing: DraftPage,
  next: DraftPage,
  aliases: Map<string, ZenAliasTarget>,
): DraftPage {
  const tts = applyZenTtsList(existing.tts, next.tts, aliases);

  if (existing.type === "outro") {
    return {
      ...existing,
      title: next.title,
      meta: {
        ...existing.meta,
        tags: next.meta.tags,
      },
      tts,
    };
  }

  return {
    ...existing,
    title: next.title,
    meta: {
      tags: next.meta.tags,
    },
    tts,
  };
}

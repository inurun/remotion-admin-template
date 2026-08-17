import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import { applyZenTtsList } from "@/app/features/zen/apply-zen-tts";
import type { ZenAliasTarget } from "@/app/features/zen/types";

export function applyZenPage(
  existing: PageFormValues,
  next: PageFormValues,
  aliases: Map<string, ZenAliasTarget>,
): PageFormValues {
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

  if (existing.type === "endcard") {
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

import { z } from "zod";
import {
  collectNiconicoParentWorkIds,
  formatParentWorkIdsInput,
  normalizeNiconicoMeta,
  parseParentWorkIdsInput,
  type ProjectNiconicoMeta,
} from "@/_shared/project/project-meta";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import type { TransitionFormValues } from "@/app/features/page/model/transition-form-schema";

import { createNiconicoTags, getConfiguredNiconicoTags } from "./niconico-tags";

function parseTagsInput(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/\s+/u)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
}

export const niconicoFormSchema = z.object({
  title: z.string(),
  description: z.string(),
  thumbnailTime: z.string(),
  parentWorkIds: z.string(),
  tags: z.string().refine((value) => parseTagsInput(value).length <= 6, {
    message: "Up to 6 tags",
  }),
});

export type NiconicoFormValues = z.infer<typeof niconicoFormSchema>;

export function toNiconicoFormValues(niconico: ProjectNiconicoMeta): NiconicoFormValues {
  const normalized = normalizeNiconicoMeta(niconico);
  return {
    title: normalized.title,
    description: normalized.description,
    thumbnailTime: normalized.thumbnailTime,
    parentWorkIds: formatParentWorkIdsInput(normalized.parentWorkIds),
    tags: getConfiguredNiconicoTags(normalized.tags).join(" "),
  };
}

export function fromNiconicoFormValues(values: NiconicoFormValues): ProjectNiconicoMeta {
  return normalizeNiconicoMeta({
    title: values.title,
    description: values.description,
    thumbnailTime: values.thumbnailTime,
    parentWorkIds: parseParentWorkIdsInput(values.parentWorkIds),
    tags: createNiconicoTags(parseTagsInput(values.tags)),
  });
}

export function parentWorkIdsInputFromOutroItems(
  items: Iterable<PageFormValues | TransitionFormValues>,
) {
  const urls: string[] = [];
  for (const item of items) {
    if (item.type !== "outro") {
      continue;
    }
    for (const block of item.meta.blocks) {
      urls.push(block.url);
    }
  }
  return formatParentWorkIdsInput(collectNiconicoParentWorkIds(urls));
}

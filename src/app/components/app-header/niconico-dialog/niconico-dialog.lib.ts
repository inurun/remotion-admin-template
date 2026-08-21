import { z } from "zod";
import {
  formatParentWorkIdsInput,
  normalizeNiconicoMeta,
  parseParentWorkIdsInput,
  type ProjectNiconicoMeta,
} from "@/_shared/project/project-meta";

export const niconicoFormSchema = z.object({
  title: z.string(),
  description: z.string(),
  thumbnailTime: z.string(),
  parentWorkIds: z.string(),
});

export type NiconicoFormValues = z.infer<typeof niconicoFormSchema>;

export function toNiconicoFormValues(niconico: ProjectNiconicoMeta): NiconicoFormValues {
  const normalized = normalizeNiconicoMeta(niconico);
  return {
    title: normalized.title,
    description: normalized.description,
    thumbnailTime: normalized.thumbnailTime,
    parentWorkIds: formatParentWorkIdsInput(normalized.parentWorkIds),
  };
}

export function fromNiconicoFormValues(values: NiconicoFormValues): ProjectNiconicoMeta {
  return normalizeNiconicoMeta({
    title: values.title,
    description: values.description,
    thumbnailTime: values.thumbnailTime,
    parentWorkIds: parseParentWorkIdsInput(values.parentWorkIds),
  });
}

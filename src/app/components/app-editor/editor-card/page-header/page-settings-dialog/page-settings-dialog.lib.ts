import { z } from "zod";
import type { CommentsPresentation } from "@/_schemas/project/comments";

export const pageSettingsFormSchema = z.object({
  title: z.string(),
  tags: z.array(
    z.object({
      value: z.string().trim().min(1, "Tag is required"),
    }),
  ),
  presentation: z.enum(["single", "triple"]),
});

export type PageSettingsFormValues = z.infer<typeof pageSettingsFormSchema>;

export function toPageSettingsFormValues({
  title,
  tags,
  presentation = "single",
}: {
  title: string;
  tags: readonly string[];
  presentation?: CommentsPresentation;
}): PageSettingsFormValues {
  return {
    title,
    tags: tags.map((value) => ({ value })),
    presentation,
  };
}

export function getSelectedPageSettingsFormValues(
  page: {
    title: string;
    meta: { tags: readonly string[]; presentation?: CommentsPresentation };
  } | null,
): PageSettingsFormValues {
  if (!page) {
    return toPageSettingsFormValues({ title: "", tags: [] });
  }

  return toPageSettingsFormValues({
    title: page.title,
    tags: page.meta.tags,
    presentation: page.meta.presentation ?? "single",
  });
}

export function getPageSettingsTags(values: PageSettingsFormValues): string[] {
  return values.tags.map((tag) => tag.value.trim());
}

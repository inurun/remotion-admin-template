import { z } from "zod";

export const pageSettingsFormSchema = z.object({
  title: z.string(),
  tags: z.array(
    z.object({
      value: z.string().trim().min(1, "Tag is required"),
    }),
  ),
});

export type PageSettingsFormValues = z.infer<typeof pageSettingsFormSchema>;

export function toPageSettingsFormValues({
  title,
  tags,
}: {
  title: string;
  tags: readonly string[];
}): PageSettingsFormValues {
  return {
    title,
    tags: tags.map((value) => ({ value })),
  };
}

export function getSelectedPageSettingsFormValues(
  page: { title: string; meta: { tags: readonly string[] } } | null,
): PageSettingsFormValues {
  if (!page) {
    return toPageSettingsFormValues({ title: "", tags: [] });
  }

  return toPageSettingsFormValues({
    title: page.title,
    tags: page.meta.tags,
  });
}

export function getPageSettingsTags(values: PageSettingsFormValues): string[] {
  return values.tags.map((tag) => tag.value.trim());
}

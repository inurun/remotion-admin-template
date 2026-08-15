import type { PageType } from "@/_schemas";

/** Identity/settings only. Page body fields (richText, tts, endcard lists) stay out. */
export type SelectedPageSummary = {
  id: string;
  title: string;
  type: PageType | "transition";
  variant?: string;
  meta: { tags: string[] };
};

export function resolveSelectedPageSummary(
  selectedPageIndex: number | null,
  id: string | undefined,
  title: string | undefined,
  type: SelectedPageSummary["type"] | undefined,
  variant: string | undefined,
  tags: readonly string[] | undefined,
): SelectedPageSummary | null {
  if (selectedPageIndex === null || id === undefined || type === undefined) {
    return null;
  }

  return {
    id,
    title: title ?? "",
    type,
    ...(type === "transition" && variant ? { variant } : {}),
    meta: { tags: [...(tags ?? [])] },
  };
}

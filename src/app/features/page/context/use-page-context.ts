import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { DraftPage, DraftProject, DraftSequenceItem, PageType } from "@/_schemas";
import { useForm as useEditorForm } from "@/app/features/editor";
import { resolvePageIndexFromFieldCount } from "@/app/features/page/lib/page-selection";

/** Fields that PageContext exposes for the selected page. Excludes richText on purpose. */
export type SelectedPageSummary = {
  id: string;
  title: string;
  type: PageType | "transition";
  variant?: string;
  meta: DraftPage["meta"];
};

type PageContextValue = {
  pageFields: Array<DraftSequenceItem & { fieldKey: string }>;
  selectedPage: SelectedPageSummary | null;
  selectedPageIndex: number | null;
  setSelectedPageIndex: Dispatch<SetStateAction<number | null>>;
  movePage: (fromIndex: number, toIndex: number) => void;
  removePage: (index: number) => void;
  appendPage: (page: DraftSequenceItem) => void;
  syncPageIndexFromFields: (pageCount: number) => void;
};

function resolveSelectedPageSummary(
  selectedPageIndex: number | null,
  id: string | undefined,
  title: string | undefined,
  type: SelectedPageSummary["type"] | undefined,
  variant: string | undefined,
  meta: DraftPage["meta"] | undefined,
): SelectedPageSummary | null {
  if (selectedPageIndex === null || id === undefined || type === undefined) {
    return null;
  }

  return {
    id,
    title: title ?? "",
    type,
    ...(type === "transition" && variant ? { variant } : {}),
    meta: meta ?? { tags: [] },
  };
}

export function usePageProviderValue(): PageContextValue {
  const { pageFields, movePage, removePage, appendPage } = useEditorForm();
  const { control } = useFormContext<DraftProject>();
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);
  const pageIndex = selectedPageIndex ?? 0;
  const watchDisabled = selectedPageIndex === null;

  // Watch only identity/settings fields. Do not watch pages[n] (includes richText/tts) or richText alone.
  const selectedPageId = useWatch({
    control,
    disabled: watchDisabled,
    name: `pages.${pageIndex}.id`,
  });
  const selectedPageTitle = useWatch({
    control,
    disabled: watchDisabled,
    name: `pages.${pageIndex}.title`,
  });
  const selectedPageType = useWatch({
    control,
    disabled: watchDisabled,
    name: `pages.${pageIndex}.type`,
  });
  const selectedPageVariant = useWatch({
    control,
    disabled: watchDisabled,
    name: `pages.${pageIndex}.variant`,
  });
  const selectedPageMeta = useWatch({
    control,
    disabled: watchDisabled,
    name: `pages.${pageIndex}.meta`,
  });

  const syncPageIndexFromFields = useCallback((pageCount: number) => {
    setSelectedPageIndex((current) => resolvePageIndexFromFieldCount(current, pageCount));
  }, []);

  const selectedPage = useMemo(
    () =>
      resolveSelectedPageSummary(
        selectedPageIndex,
        selectedPageId,
        selectedPageTitle,
        selectedPageType,
        selectedPageVariant,
        selectedPageMeta,
      ),
    [
      selectedPageId,
      selectedPageIndex,
      selectedPageMeta,
      selectedPageTitle,
      selectedPageType,
      selectedPageVariant,
    ],
  );

  return useMemo(
    () => ({
      pageFields,
      selectedPage,
      selectedPageIndex,
      setSelectedPageIndex,
      movePage,
      removePage,
      appendPage,
      syncPageIndexFromFields,
    }),
    [
      appendPage,
      movePage,
      pageFields,
      removePage,
      selectedPage,
      selectedPageIndex,
      syncPageIndexFromFields,
    ],
  );
}

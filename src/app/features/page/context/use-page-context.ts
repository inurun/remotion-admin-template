import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { DraftProject, DraftSequenceItem } from "@/_schemas";
import { useForm as useEditorForm } from "@/app/features/editor";
import { resolvePageIndexFromFieldCount } from "@/app/features/page/lib/page-selection";
import {
  resolveSelectedPageSummary,
  type SelectedPageSummary,
} from "@/app/features/page/lib/page-summary";

export type { SelectedPageSummary };

type PageContextValue = {
  pageFields: Array<DraftSequenceItem & { fieldKey: string }>;
  selectedPage: SelectedPageSummary | null;
  selectedPageIndex: number | null;
  setSelectedPageIndex: Dispatch<SetStateAction<number | null>>;
  movePage: (fromIndex: number, toIndex: number) => void;
  removePage: (index: number) => void;
  appendPage: (page: DraftSequenceItem) => void;
  insertPage: (index: number, page: DraftSequenceItem) => void;
  syncPageIndexFromFields: (pageCount: number) => void;
};

export function usePageProviderValue(): PageContextValue {
  const { pageFields, movePage, removePage, appendPage, insertPage } = useEditorForm();
  const { control } = useFormContext<DraftProject>();
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);
  const pageIndex = selectedPageIndex ?? 0;
  const watchDisabled = selectedPageIndex === null;

  // Watch only identity/settings fields. Do not watch pages[n], meta, richText, or tts.
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
  const selectedPageTags = useWatch({
    control,
    disabled: watchDisabled,
    name: `pages.${pageIndex}.meta.tags`,
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
        selectedPageTags,
      ),
    [
      selectedPageId,
      selectedPageIndex,
      selectedPageTags,
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
      insertPage,
      syncPageIndexFromFields,
    }),
    [
      appendPage,
      insertPage,
      movePage,
      pageFields,
      removePage,
      selectedPage,
      selectedPageIndex,
      syncPageIndexFromFields,
    ],
  );
}

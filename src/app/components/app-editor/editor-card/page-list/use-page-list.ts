import { useCallback, useMemo } from "react";
import type { DragEndEvent } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { useFormContext, useWatch } from "react-hook-form";
import type { DraftProject } from "@/_schemas";
import { isDraftContentPage } from "@/_schemas";
import { calculateProjectDurationSec } from "@/_shared/project/project-timing";
import { normalizeProjectMeta } from "@/_shared/project/project-meta";
import { VIDEO_FPS } from "@/constants";
import { useRemotionComposition } from "@/app/features/remotion/hook/use-remotion-composition";
import {
  getProjectPageTimings,
  getPageMoveState,
  getPageThumbnailFrame,
} from "@/app/components/app-editor/editor-card/page-list/page-list.lib";
import { useProject } from "@/app/features/project";
import { usePage } from "@/app/features/page";
import { getLandingPageTtsCount, resolveSelectedPageIndexAfterRemove } from "@/app/features/page";
import { useTts } from "@/app/features/tts";

export function usePageList() {
  const { project } = useProject();
  const { control } = useFormContext<DraftProject>();
  const meta = useWatch({ control, name: "meta" });
  const previewProject = useMemo(() => {
    return {
      ...project,
      meta: normalizeProjectMeta(meta),
    };
  }, [meta, project]);
  const component = useRemotionComposition();
  const { pageFields, selectedPageIndex, setSelectedPageIndex, movePage, removePage } = usePage();
  const { syncForPage } = useTts();
  const durationInFrames = Math.max(1, Math.ceil(calculateProjectDurationSec(project) * VIDEO_FPS));
  const savedPagesById = new Map(
    getProjectPageTimings(previewProject).map((page) => [page.id, page]),
  );

  const selectPage = useCallback(
    (index: number) => {
      setSelectedPageIndex(index);
      const item = pageFields[index];
      const ttsCount = item && isDraftContentPage(item) ? item.tts.length : 0;
      syncForPage(ttsCount);
    },
    [pageFields, setSelectedPageIndex, syncForPage],
  );

  const remove = useCallback(
    (index: number) => {
      const nextLength = pageFields.length - 1;
      const nextPageIndex = resolveSelectedPageIndexAfterRemove(
        selectedPageIndex,
        index,
        nextLength,
      );
      const landingTtsCount = getLandingPageTtsCount(pageFields, index, nextPageIndex);

      removePage(index);
      setSelectedPageIndex(nextPageIndex);
      syncForPage(landingTtsCount);
    },
    [pageFields, removePage, selectedPageIndex, setSelectedPageIndex, syncForPage],
  );

  const move = useCallback(
    (fromIndex: number, toIndex: number) => {
      const pageMove = getPageMoveState(
        pageFields.map((field) => field.id),
        selectedPageIndex,
        fromIndex,
        toIndex,
      );

      if (!pageMove) {
        return;
      }

      movePage(pageMove.fromIndex, pageMove.toIndex);
      setSelectedPageIndex(pageMove.nextSelectedPageIndex);
    },
    [movePage, pageFields, selectedPageIndex, setSelectedPageIndex],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (event.canceled) {
        return;
      }

      const { source } = event.operation;
      if (!isSortable(source)) {
        return;
      }

      move(source.initialIndex, source.index);
    },
    [move],
  );

  return {
    component,
    durationInFrames,
    project: previewProject,
    pageFields,
    selectedPageIndex,
    selectPage,
    remove,
    handleDragEnd,
    getThumbnailFrame: (pageId: string) => {
      const savedPage = savedPagesById.get(pageId);
      return savedPage ? getPageThumbnailFrame(savedPage, VIDEO_FPS, durationInFrames) : null;
    },
  };
}

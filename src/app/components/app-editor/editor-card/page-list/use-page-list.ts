import { useCallback } from "react";
import type { DragEndEvent } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { useRemotionComposition } from "@/app/features/remotion/hook/use-remotion-composition";
import { getPageMoveState } from "@/app/components/app-editor/editor-card/page-list/page-list.lib";
import { useEditorSession } from "@/app/features/editor/store/editor-session-store-context";
import {
  useProjectRoute,
  useSelectedPageId,
} from "@/app/features/project/context/project-route-context";
import { getProjectPageHref, getProjectRootHref } from "@/app/features/project/lib/project-route";
import { resolveSelectedPageIndexAfterRemove } from "@/app/features/page";

export function usePageList() {
  const component = useRemotionComposition();
  const sequenceOrder = useEditorSession((state) => state.sequenceOrder);
  const removeSequenceItem = useEditorSession((state) => state.removeSequenceItem);
  const reorderSequence = useEditorSession((state) => state.reorderSequence);
  const selectedPageId = useSelectedPageId();
  const { projectPath, navigate } = useProjectRoute();
  const selectedPageIndex = selectedPageId ? sequenceOrder.indexOf(selectedPageId) : -1;

  const selectPage = useCallback(
    (index: number) => {
      const pageId = sequenceOrder[index];
      if (!pageId || !projectPath) {
        return;
      }
      navigate(getProjectPageHref(projectPath, pageId));
    },
    [navigate, projectPath, sequenceOrder],
  );

  const remove = useCallback(
    (index: number) => {
      const pageId = sequenceOrder[index];
      if (!pageId || !projectPath) {
        return;
      }
      const nextLength = sequenceOrder.length - 1;
      const nextPageIndex = resolveSelectedPageIndexAfterRemove(
        selectedPageIndex === -1 ? null : selectedPageIndex,
        index,
        nextLength,
      );
      removeSequenceItem(pageId);
      const nextIds = sequenceOrder.filter((_, itemIndex) => itemIndex !== index);
      const nextItemId = nextPageIndex === null ? undefined : nextIds[nextPageIndex];
      navigate(
        nextItemId ? getProjectPageHref(projectPath, nextItemId) : getProjectRootHref(projectPath),
      );
    },
    [navigate, projectPath, removeSequenceItem, selectedPageIndex, sequenceOrder],
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

      const pageMove = getPageMoveState(
        sequenceOrder,
        selectedPageIndex === -1 ? null : selectedPageIndex,
        source.initialIndex,
        source.index,
      );
      if (!pageMove) {
        return;
      }

      const nextIds = [...sequenceOrder];
      const [moved] = nextIds.splice(pageMove.fromIndex, 1);
      if (!moved) {
        return;
      }
      nextIds.splice(pageMove.toIndex, 0, moved);
      reorderSequence(nextIds);
    },
    [reorderSequence, selectedPageIndex, sequenceOrder],
  );

  return {
    component,
    sequenceOrder,
    selectedPageIndex,
    selectPage,
    remove,
    handleDragEnd,
  };
}

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { DragEndEvent } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { VIDEO_FPS } from "@/constants";
import { useRemotionPlayerControl } from "@/app/features/remotion/context/remotion-player-control-context";
import {
  getPageMoveState,
  getPlayingPageId,
  getProjectPageTimings,
} from "@/app/components/app-editor/editor-card/page-list/page-list.lib";
import { useEditorSession } from "@/app/features/editor/store/editor-session-store-context";
import { useSavedProject } from "@/app/features/editor/store/saved-project-store-context";
import {
  useProjectRoute,
  useSelectedPageId,
} from "@/app/features/project/context/project-route-context";
import { getProjectPageHref, getProjectRootHref } from "@/app/features/project/lib/project-route";
import { resolveSelectedPageIndexAfterRemove } from "@/app/features/page";

export function usePageList() {
  const sequenceOrder = useEditorSession((state) => state.sequenceOrder);
  const removeSequenceItem = useEditorSession((state) => state.removeSequenceItem);
  const reorderSequence = useEditorSession((state) => state.reorderSequence);
  const selectedPageId = useSelectedPageId();
  const { projectPath, navigate } = useProjectRoute();
  const selectedPageIndex = selectedPageId ? sequenceOrder.indexOf(selectedPageId) : -1;
  const timeline = useSavedProject((state) => state.timeline);
  const pageTimings = useMemo(() => getProjectPageTimings(timeline), [timeline]);
  const playerControl = useRemotionPlayerControl();
  const playingPageId = useSyncExternalStore(
    useCallback(
      (onStoreChange) => {
        const handleFrameChange = () => onStoreChange();
        playerControl.addEventListener("frameupdate", handleFrameChange);
        playerControl.addEventListener("seeked", handleFrameChange);
        return () => {
          playerControl.removeEventListener("frameupdate", handleFrameChange);
          playerControl.removeEventListener("seeked", handleFrameChange);
        };
      },
      [playerControl],
    ),
    () => getPlayingPageId(pageTimings, playerControl.getCurrentFrame(), VIDEO_FPS),
    () => pageTimings[0]?.id ?? null,
  );

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
    sequenceOrder,
    selectedPageIndex,
    playingPageId,
    selectPage,
    remove,
    handleDragEnd,
  };
}

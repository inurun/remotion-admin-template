import { useSortable } from "@dnd-kit/react/sortable";
import {
  getPageListStaggerDelayMs,
  resolvePageListItemPresentation,
} from "@/app/components/app-editor/editor-card/page-list/page-list.lib";
import type { PageThumbnailProps } from "@/app/components/app-editor/editor-card/page-list/page-list-item/page-thumbnail/use-page-thumbnail";
import { useEditorSession } from "@/app/features/editor/store/editor-session-store-context";
import { useSavedProject } from "@/app/features/editor/store/saved-project-store-context";

export type PageListItemProps = {
  index: number;
  isSelected: boolean;
  onRemove: () => void;
  onSelect: () => void;
  pageId: string;
  thumbnail: Omit<PageThumbnailProps, "dirty">;
};

export function usePageListItem({ index, pageId }: Pick<PageListItemProps, "index" | "pageId">) {
  const width = useSavedProject((state) => state.project.meta.width);
  const height = useSavedProject((state) => state.project.meta.height);
  const item = useEditorSession((state) => state.itemsById[pageId]);
  const dirty = useEditorSession((state) => (state.dirty.itemIds[pageId] ?? 0) > 0);
  const { ref, handleRef, isDragging } = useSortable({
    id: pageId,
    index,
    transition: {
      duration: 160,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
      idle: true,
    },
  });

  return {
    ref,
    handleRef,
    isDragging,
    aspectRatio: `${width} / ${height}`,
    dirty,
    presentation: resolvePageListItemPresentation(item),
    staggerDelayMs: getPageListStaggerDelayMs(index),
  };
}

import { useCallback, useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/react/sortable";
import { resolvePageListItemPresentation } from "@/app/components/app-editor/editor-card/page-list/page-list.lib";
import { useEditorSession } from "@/app/features/editor/store/editor-session-store-context";
import { useSavedProject } from "@/app/features/editor/store/saved-project-store-context";

export type PageListItemProps = {
  index: number;
  isPlaying: boolean;
  isSelected: boolean;
  onRemove: () => void;
  onSelect: () => void;
  pageId: string;
};

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}

export function usePageListItem({
  index,
  isPlaying,
  pageId,
}: Pick<PageListItemProps, "index" | "isPlaying" | "pageId">) {
  const width = useSavedProject((state) => state.project.meta.width);
  const height = useSavedProject((state) => state.project.meta.height);
  const item = useEditorSession((state) => state.itemsById[pageId]);
  const dirty = useEditorSession((state) => (state.dirty.itemIds[pageId] ?? 0) > 0);
  const nodeRef = useRef<HTMLElement | null>(null);
  const {
    ref: sortableRef,
    handleRef,
    isDragging,
  } = useSortable({
    id: pageId,
    index,
    transition: {
      duration: 160,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
      idle: true,
    },
  });
  const ref = useCallback(
    (node: HTMLElement | null) => {
      nodeRef.current = node;
      assignRef(sortableRef, node);
    },
    [sortableRef],
  );

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    nodeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [isPlaying]);

  return {
    ref,
    handleRef,
    isDragging,
    aspectRatio: `${width} / ${height}`,
    dirty,
    presentation: resolvePageListItemPresentation(item),
  };
}

import { useDraggable } from "@dnd-kit/react";
import { useTts } from "@/app/features/tts";
import { useSelectedPage } from "@/app/features/page";
import { useSavedProject } from "@/app/features/editor/store/saved-project-store-context";
import type { CommentDragData } from "@/app/features/comments/comment-operations";

export function useReplyRow(data: CommentDragData) {
  const { selectedTtsId } = useTts();
  const { ref, handleRef, isDragging } = useDraggable({
    id: `reply:${data.entityId}`,
    data,
  });
  const { pageId } = useSelectedPage();
  const audio = useSavedProject((state) => {
    const item = state.itemsById[pageId];
    if (!item || item.type === "transition") {
      return undefined;
    }
    return item.tts.find((tts) => tts.id === data.entityId)?.audio;
  });
  return {
    ref,
    handleRef,
    isDragging,
    isSelected: selectedTtsId === data.entityId,
    synthesisStatus:
      audio?.status === "analyzing" || audio?.status === "pending" || audio?.status === "failed"
        ? audio.status
        : undefined,
    synthesisError: audio?.status === "failed" ? audio.error : undefined,
  };
}

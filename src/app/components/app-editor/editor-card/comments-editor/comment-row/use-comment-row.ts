import { useDraggable } from "@dnd-kit/react";
import type { CommentDragData } from "@/app/features/comments/comment-operations";

export function useCommentRow(data: CommentDragData) {
  const { ref, handleRef, isDragging } = useDraggable({
    id: `comment:${data.entityId}`,
    data,
  });
  return { ref, handleRef, isDragging };
}

import { useDraggable } from "@dnd-kit/react";
import type { CommentDragData } from "@/app/features/comments/comment-operations";

export function useCommentGroupBlock(data: CommentDragData) {
  return useDraggable({
    id: `group:${data.entityId}`,
    data,
  });
}

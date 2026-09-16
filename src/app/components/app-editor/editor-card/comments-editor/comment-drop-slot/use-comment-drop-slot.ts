import { useDroppable } from "@dnd-kit/react";
import type { CommentDropData } from "@/app/features/comments/comment-operations";

export function useCommentDropSlot(id: string, data: CommentDropData) {
  const { ref, isDropTarget } = useDroppable({ id, data });
  return { ref, isDropTarget };
}

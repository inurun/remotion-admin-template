import { useDraggable } from "@dnd-kit/react";
import type { CommentDragData } from "@/app/features/comments/comment-operations";

export function useCommentSceneBlock(data: Extract<CommentDragData, { kind: "scene" }>) {
  return useDraggable({
    id: `scene:${data.entityId}`,
    data,
  });
}

import { useDraggable } from "@dnd-kit/react";
import { useFormContext, useWatch } from "react-hook-form";
import type { Control } from "react-hook-form";
import type {
  CommentsPageFormValues,
  PageFormValues,
} from "@/app/features/page/model/page-form-schema";
import type { CommentDragData } from "@/app/features/comments/comment-operations";

export function useCommentRow(data: CommentDragData, commentIndex: number) {
  const { ref, handleRef, isDragging } = useDraggable({
    id: `comment:${data.entityId}`,
    data,
  });
  const { control, setValue } = useFormContext<PageFormValues>();
  const commentsControl = control as unknown as Control<CommentsPageFormValues>;
  const body = useWatch({
    control: commentsControl,
    name: `comments.${commentIndex}.body`,
  });
  const fieldName = `comments.${commentIndex}.body` as const;

  return {
    ref,
    handleRef,
    isDragging,
    body: body ?? "",
    changeBody: (next: string) => {
      setValue(fieldName, next, { shouldDirty: true });
    },
  };
}

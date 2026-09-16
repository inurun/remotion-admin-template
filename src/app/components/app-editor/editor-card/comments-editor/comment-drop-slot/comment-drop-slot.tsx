import { cn } from "@/_shared/lib/utils";
import type { CommentDropData } from "@/app/features/comments/comment-operations";
import { useCommentDropSlot } from "./use-comment-drop-slot";

export function CommentDropSlot({
  id,
  data,
  label,
}: {
  id: string;
  data: CommentDropData;
  label: string;
}) {
  const { ref, isDropTarget } = useCommentDropSlot(id, data);
  return (
    <div
      ref={ref}
      className={cn(
        "h-2 rounded-sm",
        isDropTarget ? "bg-primary/40 h-8 px-2 text-xs leading-8 text-primary-foreground" : "",
      )}
    >
      {isDropTarget ? label : null}
    </div>
  );
}

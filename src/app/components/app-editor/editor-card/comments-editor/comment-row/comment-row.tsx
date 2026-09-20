import { memo } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { cn } from "@/_shared/lib/utils";
import { formatVposMs } from "@/app/components/app-editor/editor-card/page-header/page-settings-dialog/comment-import/comment-import.lib";
import { useCommentRow } from "./use-comment-row";

export const CommentRow = memo(function CommentRow({
  pageId,
  groupId,
  commentId,
  commentIndex,
  vposMs,
  onRemove,
}: {
  pageId: string;
  groupId: string;
  commentId: string;
  commentIndex: number;
  vposMs: number;
  onRemove: (commentId: string) => void;
}) {
  const { ref, handleRef, isDragging, body, changeBody } = useCommentRow(
    {
      kind: "comment",
      pageId,
      groupId,
      entityId: commentId,
    },
    commentIndex,
  );

  return (
    <div ref={ref} className={cn("flex items-center gap-2 py-1", isDragging && "opacity-60")}>
      <span
        ref={handleRef}
        className="inline-flex size-6 cursor-grab items-center justify-center text-muted-foreground"
      >
        <GripVertical className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <Textarea
          value={body}
          onChange={(event) => changeBody(event.target.value)}
          onPointerDown={(event) => event.stopPropagation()}
        />
      </div>
      <span className="text-xs text-muted-foreground">{formatVposMs(vposMs)}</span>
      <Button type="button" size="icon-xs" variant="ghost" onClick={() => onRemove(commentId)}>
        <Trash2 />
      </Button>
    </div>
  );
});

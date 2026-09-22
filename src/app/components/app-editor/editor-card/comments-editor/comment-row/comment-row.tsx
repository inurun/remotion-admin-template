import { memo } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { formatVposMs } from "@/app/components/app-editor/editor-card/page-header/page-settings-dialog/comment-import/comment-import.lib";
import { useCommentRow } from "./use-comment-row";

export const CommentRow = memo(function CommentRow({
  commentId,
  commentIndex,
  vposMs,
  onRemove,
}: {
  commentId: string;
  commentIndex: number;
  vposMs: number;
  onRemove: (commentId: string) => void;
}) {
  const { body, changeBody } = useCommentRow(commentIndex);

  return (
    <div className="flex items-center gap-2 py-1">
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

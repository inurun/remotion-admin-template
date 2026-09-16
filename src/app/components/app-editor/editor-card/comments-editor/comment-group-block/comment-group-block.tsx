import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { cn } from "@/_shared/lib/utils";
import { commentGroupDisplayText } from "@/app/features/comments/resolve-comment-groups";
import type { ResolvedCommentGroup } from "@/app/features/comments/resolve-comment-groups";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import { CommentDropSlot } from "../comment-drop-slot/comment-drop-slot";
import { CommentRow } from "../comment-row/comment-row";
import { ReplyRow } from "../reply-row/reply-row";
import { useCommentGroupBlock } from "./use-comment-group-block";

export function CommentGroupBlock({
  pageId,
  resolved,
  commentsById,
  groupIndex,
  groupCount,
  onAddReply,
  onRemoveGroup,
  onRemoveComment,
  onChangeCommentBody,
  onRemoveReply,
  onInsertReplyAfter,
  onSelectReply,
  onDisplayText,
}: {
  pageId: string;
  resolved: ResolvedCommentGroup<TtsFormValues>;
  commentsById: Map<string, { body: string }>;
  groupIndex: number;
  groupCount: number;
  onAddReply: () => void;
  onRemoveGroup: () => void;
  onRemoveComment: (commentId: string) => void;
  onChangeCommentBody: (commentId: string, body: string) => void;
  onRemoveReply: (ttsId: string) => void;
  onInsertReplyAfter: (ttsId: string) => void;
  onSelectReply: (ttsId: string) => void;
  onDisplayText: (value: string | null) => void;
}) {
  const { group, comments, replies } = resolved;
  const { ref, handleRef, isDragging } = useCommentGroupBlock({
    kind: "group",
    pageId,
    groupId: group.id,
    entityId: group.id,
  });

  return (
    <article
      ref={ref}
      className={cn("grid gap-2 rounded-lg border border-border p-3", isDragging && "opacity-60")}
    >
      <CommentDropSlot
        id={`drop:merge:${group.id}`}
        data={{ kind: "merge-group", pageId, groupId: group.id }}
        label="Merge here"
      />
      <div className="flex items-center gap-2">
        <span
          ref={handleRef}
          className="inline-flex size-6 cursor-grab items-center justify-center text-muted-foreground"
        >
          <GripVertical className="size-4" />
        </span>
        <p className="flex-1 text-sm font-medium">{comments.length} comments</p>
        <Button type="button" size="icon-xs" variant="destructive" onClick={onRemoveGroup}>
          <Trash2 />
        </Button>
      </div>
      {comments.map((comment, index) => (
        <div key={comment.id}>
          <CommentDropSlot
            id={`drop:comment:${group.id}:${index}`}
            data={{ kind: "comment-slot", pageId, groupId: group.id, index }}
            label="Move comment"
          />
          <CommentRow
            pageId={pageId}
            groupId={group.id}
            comment={comment}
            onChangeBody={(body) => onChangeCommentBody(comment.id, body)}
            onRemove={() => onRemoveComment(comment.id)}
          />
        </div>
      ))}
      <CommentDropSlot
        id={`drop:comment:${group.id}:end`}
        data={{ kind: "comment-slot", pageId, groupId: group.id, index: comments.length }}
        label="Move comment"
      />
      <label className="grid gap-1 text-xs">
        Display
        <Input
          value={group.displayText ?? ""}
          placeholder={commentGroupDisplayText(group, commentsById)}
          onChange={(event) => onDisplayText(event.target.value === "" ? null : event.target.value)}
        />
      </label>
      {replies.map((reply, index) => (
        <div key={reply.id}>
          <CommentDropSlot
            id={`drop:reply:${group.id}:${index}`}
            data={{ kind: "reply-slot", pageId, groupId: group.id, index }}
            label="Move reply"
          />
          <ReplyRow
            pageId={pageId}
            groupId={group.id}
            ttsId={reply.id}
            onRemove={() => onRemoveReply(reply.id)}
            onInsertAfter={() => onInsertReplyAfter(reply.id)}
            onSelect={() => onSelectReply(reply.id)}
          />
        </div>
      ))}
      <CommentDropSlot
        id={`drop:reply:${group.id}:end`}
        data={{ kind: "reply-slot", pageId, groupId: group.id, index: replies.length }}
        label="Move reply"
      />
      <Button type="button" size="sm" variant="outline" onClick={onAddReply}>
        <Plus />
        Add reply
      </Button>
      <CommentDropSlot
        id={`drop:new:${group.id}`}
        data={{ kind: "new-group", pageId, index: groupIndex + 1 }}
        label="New group"
      />
      {groupIndex === groupCount - 1 ? (
        <CommentDropSlot
          id={`drop:reorder:end`}
          data={{ kind: "reorder-group", pageId, index: groupCount - 1 }}
          label="Move group"
        />
      ) : (
        <CommentDropSlot
          id={`drop:reorder:${groupIndex + 1}`}
          data={{ kind: "reorder-group", pageId, index: groupIndex + 1 }}
          label="Move group"
        />
      )}
    </article>
  );
}

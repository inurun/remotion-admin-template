import { memo } from "react";
import { ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/_shared/lib/utils";
import { CommentDropSlot } from "../comment-drop-slot/comment-drop-slot";
import { CommentRow } from "../comment-row/comment-row";
import { ReplyRow } from "../reply-row/reply-row";
import { useCommentGroupBlock } from "./use-comment-group-block";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/components/ui/collapsible";
import { GroupDisplayTextField } from "./group-display-text-field/group-display-text-field";
import type { CommentsEditorComment } from "../comments-editor.lib";

export const CommentGroupBlock = memo(function CommentGroupBlock({
  pageId,
  groupId,
  commentIds,
  ttsIds,
  commentsLookup,
  commentIndexById,
  ttsIndexById,
  groupIndex,
  groupCount,
  onAddReply,
  onRemoveGroup,
  onRemoveComment,
  onRemoveReply,
  onInsertReplyAfter,
  onSelectReply,
}: {
  pageId: string;
  groupId: string;
  commentIds: readonly string[];
  ttsIds: readonly string[];
  commentsLookup: Readonly<Record<string, CommentsEditorComment>>;
  commentIndexById: Readonly<Record<string, number>>;
  ttsIndexById: Readonly<Record<string, number>>;
  groupIndex: number;
  groupCount: number;
  onAddReply: (groupId: string) => void;
  onRemoveGroup: (groupId: string) => void;
  onRemoveComment: (commentId: string) => void;
  onRemoveReply: (ttsId: string) => void;
  onInsertReplyAfter: (ttsId: string) => void;
  onSelectReply: (ttsId: string) => void;
}) {
  const { ref, handleRef, isDragging } = useCommentGroupBlock({
    kind: "group",
    pageId,
    groupId,
    entityId: groupId,
  });
  const firstCommentIndex = commentIndexById[commentIds[0] ?? ""] ?? -1;

  return (
    <article
      ref={ref}
      className={cn("grid rounded-lg border border-border px-3 pt-3", isDragging && "opacity-60")}
    >
      <CommentDropSlot
        id={`drop:merge:${groupId}`}
        data={{ kind: "merge-group", pageId, groupId }}
        label="Merge here"
      />
      <Collapsible>
        <div className="flex items-center gap-2">
          <span
            ref={handleRef}
            className="inline-flex size-6 cursor-grab items-center justify-center text-muted-foreground"
          >
            <GripVertical className="size-4" />
          </span>
          <GroupDisplayTextField groupIndex={groupIndex} firstCommentIndex={firstCommentIndex} />
          <CollapsibleTrigger>
            <Button type="button" size="icon-xs" variant="outline">
              {commentIds.length > 1 ? commentIds.length : <ChevronDown />}
            </Button>
          </CollapsibleTrigger>
          <Button
            type="button"
            size="icon-xs"
            variant="destructive"
            onClick={() => onRemoveGroup(groupId)}
          >
            <Trash2 />
          </Button>
        </div>
        <CollapsibleContent>
          {commentIds.map((commentId, index) => {
            const comment = commentsLookup[commentId];
            const commentIndex = commentIndexById[commentId];
            if (!comment || commentIndex === undefined) {
              return null;
            }
            return (
              <div key={commentId} className="pl-3">
                <CommentDropSlot
                  id={`drop:comment:${groupId}:${index}`}
                  data={{ kind: "comment-slot", pageId, groupId, index }}
                  label="Move comment"
                />
                <CommentRow
                  pageId={pageId}
                  groupId={groupId}
                  commentId={commentId}
                  commentIndex={commentIndex}
                  vposMs={comment.vposMs}
                  onRemove={onRemoveComment}
                />
              </div>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
      <CommentDropSlot
        id={`drop:comment:${groupId}:end`}
        data={{ kind: "comment-slot", pageId, groupId, index: commentIds.length }}
        label="Move comment"
      />
      {ttsIds.map((ttsId, index) => {
        const formIndex = ttsIndexById[ttsId];
        if (formIndex === undefined) {
          return null;
        }
        return (
          <div key={ttsId}>
            <CommentDropSlot
              id={`drop:reply:${groupId}:${index}`}
              data={{ kind: "reply-slot", pageId, groupId, index }}
              label="Move reply"
            />
            <ReplyRow
              pageId={pageId}
              groupId={groupId}
              ttsId={ttsId}
              formIndex={formIndex}
              onRemove={onRemoveReply}
              onInsertAfter={onInsertReplyAfter}
              onSelect={onSelectReply}
            />
          </div>
        );
      })}
      <CommentDropSlot
        id={`drop:reply:${groupId}:end`}
        data={{ kind: "reply-slot", pageId, groupId, index: ttsIds.length }}
        label="Move reply"
      />
      <Button type="button" size="sm" variant="outline" onClick={() => onAddReply(groupId)}>
        <Plus />
        Add reply
      </Button>
      <CommentDropSlot
        id={`drop:new:${groupId}`}
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
});

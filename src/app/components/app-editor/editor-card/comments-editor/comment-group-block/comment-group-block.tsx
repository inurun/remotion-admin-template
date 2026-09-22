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
  sceneId,
  groupId,
  commentIds,
  ttsIds,
  commentsLookup,
  commentIndexById,
  ttsIndexById,
  formIndex,
  spoken,
  onAddReply,
  onRemoveGroup,
  onRemoveComment,
  onRemoveReply,
  onInsertReplyAfter,
  onSelectReply,
}: {
  pageId: string;
  sceneId: string;
  groupId: string;
  commentIds: readonly string[];
  ttsIds: readonly string[];
  commentsLookup: Readonly<Record<string, CommentsEditorComment>>;
  commentIndexById: Readonly<Record<string, number>>;
  ttsIndexById: Readonly<Record<string, number>>;
  formIndex: number;
  spoken: boolean;
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
    sceneId,
    groupId,
    entityId: groupId,
  });
  const firstCommentIndex = commentIndexById[commentIds[0] ?? ""] ?? -1;

  return (
    <article
      ref={ref}
      className={cn(
        "grid rounded-lg border border-border px-3 pt-3",
        spoken && "bg-primary/10",
        isDragging && "opacity-60",
      )}
    >
      <Collapsible>
        <div className="flex items-center gap-2">
          <span
            ref={handleRef}
            className="inline-flex size-6 cursor-grab items-center justify-center text-muted-foreground"
          >
            <GripVertical className="size-4" />
          </span>
          <GroupDisplayTextField groupIndex={formIndex} firstCommentIndex={firstCommentIndex} />
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
          {commentIds.map((commentId) => {
            const comment = commentsLookup[commentId];
            const commentIndex = commentIndexById[commentId];
            if (!comment || commentIndex === undefined) {
              return null;
            }
            return (
              <div key={commentId} className="pl-3">
                <CommentRow
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
      {ttsIds.map((ttsId, index) => {
        const ttsFormIndex = ttsIndexById[ttsId];
        if (ttsFormIndex === undefined) {
          return null;
        }
        return (
          <div key={ttsId}>
            <CommentDropSlot
              id={`drop:reply:${groupId}:${index}`}
              data={{ kind: "reply-slot", pageId, sceneId, groupId, index }}
              label="Move reply"
            />
            <ReplyRow
              pageId={pageId}
              sceneId={sceneId}
              groupId={groupId}
              ttsId={ttsId}
              formIndex={ttsFormIndex}
              onRemove={onRemoveReply}
              onInsertAfter={onInsertReplyAfter}
              onSelect={onSelectReply}
            />
          </div>
        );
      })}
      <CommentDropSlot
        id={`drop:reply:${groupId}:end`}
        data={{ kind: "reply-slot", pageId, sceneId, groupId, index: ttsIds.length }}
        label="Move reply"
      />
      <Button type="button" size="sm" variant="outline" onClick={() => onAddReply(groupId)}>
        <Plus />
        Add reply
      </Button>
    </article>
  );
});

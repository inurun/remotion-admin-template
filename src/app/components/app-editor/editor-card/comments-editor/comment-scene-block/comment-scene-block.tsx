import { memo } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/_shared/lib/utils";
import { CommentDropSlot } from "../comment-drop-slot/comment-drop-slot";
import { CommentGroupBlock } from "../comment-group-block/comment-group-block";
import { useCommentSceneBlock } from "./use-comment-scene-block";
import type { CommentsEditorComment, CommentsEditorGroup } from "../comments-editor.lib";

export const CommentSceneBlock = memo(function CommentSceneBlock({
  pageId,
  sceneId,
  groups,
  commentsLookup,
  commentIndexById,
  ttsIndexById,
  groupFormIndexById,
  spokenIds,
  onAddReply,
  onRemoveGroup,
  onRemoveComment,
  onRemoveReply,
  onInsertReplyAfter,
  onSelectReply,
}: {
  pageId: string;
  sceneId: string;
  groups: readonly CommentsEditorGroup[];
  commentsLookup: Readonly<Record<string, CommentsEditorComment>>;
  commentIndexById: Readonly<Record<string, number>>;
  ttsIndexById: Readonly<Record<string, number>>;
  groupFormIndexById: Readonly<Record<string, number>>;
  spokenIds: ReadonlySet<string>;
  onAddReply: (groupId: string) => void;
  onRemoveGroup: (groupId: string) => void;
  onRemoveComment: (commentId: string) => void;
  onRemoveReply: (ttsId: string) => void;
  onInsertReplyAfter: (ttsId: string) => void;
  onSelectReply: (ttsId: string) => void;
}) {
  const { ref, handleRef, isDragging } = useCommentSceneBlock({
    kind: "scene",
    pageId,
    sceneId,
    entityId: sceneId,
  });

  return (
    <section
      ref={ref}
      className={cn(
        "grid gap-3 rounded-xl border border-border/60 p-3",
        isDragging && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <span
          ref={handleRef}
          className="inline-flex size-6 cursor-grab items-center justify-center"
        >
          <GripVertical className="size-4" />
        </span>
      </div>
      <CommentDropSlot
        id={`drop:group:${sceneId}:0`}
        data={{ kind: "reorder-group", pageId, sceneId, index: 0 }}
        label="Move group"
      />
      {groups.map((group, index) => {
        const formIndex = groupFormIndexById[group.id];
        if (formIndex === undefined) {
          return null;
        }
        return (
          <div key={group.id} className="grid gap-3">
            <CommentGroupBlock
              pageId={pageId}
              sceneId={sceneId}
              groupId={group.id}
              commentIds={group.commentIds}
              ttsIds={group.ttsIds}
              commentsLookup={commentsLookup}
              commentIndexById={commentIndexById}
              ttsIndexById={ttsIndexById}
              formIndex={formIndex}
              spoken={spokenIds.has(group.id)}
              onAddReply={onAddReply}
              onRemoveGroup={onRemoveGroup}
              onRemoveComment={onRemoveComment}
              onRemoveReply={onRemoveReply}
              onInsertReplyAfter={onInsertReplyAfter}
              onSelectReply={onSelectReply}
            />
            <CommentDropSlot
              id={`drop:group:${sceneId}:${index + 1}`}
              data={{ kind: "reorder-group", pageId, sceneId, index: index + 1 }}
              label="Move group"
            />
          </div>
        );
      })}
    </section>
  );
});

import { DragDropProvider } from "@dnd-kit/react";
import { CommentDropSlot } from "./comment-drop-slot/comment-drop-slot";
import { CommentGroupBlock } from "./comment-group-block/comment-group-block";
import { useCommentsEditor } from "./use-comments-editor";

export function CommentsEditor() {
  const editor = useCommentsEditor();
  const structure = editor.structure;
  if (!structure) {
    return null;
  }

  return (
    <DragDropProvider onDragEnd={editor.handleDragEnd}>
      <div className="grid gap-3">
        <CommentDropSlot
          id="drop:new:0"
          data={{ kind: "new-group", pageId: editor.pageId, index: 0 }}
          label="New group"
        />
        <CommentDropSlot
          id="drop:reorder:0"
          data={{ kind: "reorder-group", pageId: editor.pageId, index: 0 }}
          label="Move group"
        />
        {structure.groups.map((group, index) => (
          <CommentGroupBlock
            key={group.id}
            pageId={editor.pageId}
            groupId={group.id}
            commentIds={group.commentIds}
            ttsIds={group.ttsIds}
            commentsLookup={editor.commentsLookup}
            commentIndexById={editor.commentIndexById}
            ttsIndexById={editor.ttsIndexById}
            groupIndex={index}
            groupCount={structure.groups.length}
            onAddReply={editor.addReply}
            onRemoveGroup={editor.removeGroup}
            onRemoveComment={editor.removeComment}
            onRemoveReply={editor.removeReply}
            onInsertReplyAfter={editor.insertReplyAfter}
            onSelectReply={editor.selectReply}
          />
        ))}
      </div>
    </DragDropProvider>
  );
}

import { DragDropProvider } from "@dnd-kit/react";
import { CommentDropSlot } from "./comment-drop-slot/comment-drop-slot";
import { CommentGroupBlock } from "./comment-group-block/comment-group-block";
import { useCommentsEditor } from "./use-comments-editor";

export function CommentsEditor() {
  const editor = useCommentsEditor();
  if (!editor.commentsPage) {
    return null;
  }

  const commentsById = new Map(
    editor.commentsPage.comments.map((comment) => [comment.id, comment]),
  );

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
        {editor.groups.map((resolved, index) => (
          <CommentGroupBlock
            key={resolved.group.id}
            pageId={editor.pageId}
            resolved={resolved}
            commentsById={commentsById}
            groupIndex={index}
            groupCount={editor.groups.length}
            onAddReply={() => editor.addReply(resolved.group.id)}
            onRemoveGroup={() => editor.removeGroup(resolved.group.id)}
            onRemoveComment={editor.removeComment}
            onChangeCommentBody={editor.setCommentBody}
            onRemoveReply={editor.removeReply}
            onInsertReplyAfter={editor.insertReplyAfter}
            onSelectReply={editor.selectReply}
            onDisplayText={(value) => editor.setDisplayText(resolved.group.id, value)}
          />
        ))}
      </div>
    </DragDropProvider>
  );
}

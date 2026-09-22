import { DragDropProvider } from "@dnd-kit/react";
import { CommentDropSlot } from "./comment-drop-slot/comment-drop-slot";
import { CommentSceneBlock } from "./comment-scene-block/comment-scene-block";
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
          id="drop:scene:0"
          data={{ kind: "reorder-scene", pageId: editor.pageId, index: 0 }}
          label="Move scene"
        />
        {structure.scenes.map((scene, index) => (
          <div key={scene.id} className="grid gap-3">
            <CommentSceneBlock
              pageId={editor.pageId}
              sceneId={scene.id}
              groups={scene.groups}
              commentsLookup={editor.commentsLookup}
              commentIndexById={editor.commentIndexById}
              ttsIndexById={editor.ttsIndexById}
              groupFormIndexById={editor.groupFormIndexById}
              spokenIds={editor.spokenIds}
              onAddReply={editor.addReply}
              onRemoveGroup={editor.removeGroup}
              onRemoveComment={editor.removeComment}
              onRemoveReply={editor.removeReply}
              onInsertReplyAfter={editor.insertReplyAfter}
              onSelectReply={editor.selectReply}
            />
            <CommentDropSlot
              id={`drop:scene:${index + 1}`}
              data={{ kind: "reorder-scene", pageId: editor.pageId, index: index + 1 }}
              label="Move scene"
            />
          </div>
        ))}
      </div>
    </DragDropProvider>
  );
}

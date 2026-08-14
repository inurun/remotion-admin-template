import { EditorContent } from "@tiptap/react";

import { cn } from "@/_shared/lib/utils";
import { RichTextEditorToolbar } from "./rich-text-editor-toolbar";
import { useRichTextEditor } from "./use-rich-text-editor";
import { useRichTextEditorActions } from "./use-rich-text-editor-actions";
import type { UploadMedia } from "./use-rich-text-media-upload";
import type { FetchOgp } from "./use-rich-text-ogp-insert";
import { isSingleImageRichText } from "./rich-text";

export function RichTextEditor({
  value,
  onChange,
  onRemove,
  uploadImage,
  uploadVideo,
  fetchOgp,
}: {
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  uploadImage: UploadMedia;
  uploadVideo: UploadMedia;
  fetchOgp: FetchOgp;
}) {
  const imageOnly = isSingleImageRichText(value);
  const editor = useRichTextEditor({ value, onChange });
  const actions = useRichTextEditorActions({
    editor,
    uploadImage,
    uploadVideo,
    fetchOgp,
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="grid gap-2">
      <RichTextEditorToolbar
        editor={editor}
        fetchingOgp={actions.fetchingOgp}
        imageInputRef={actions.imageInputRef}
        onImageFileChange={actions.onImageFileChange}
        onInsertOgp={actions.insertOgpCard}
        onOpenImageDialog={actions.onOpenImageDialog}
        onOpenVideoDialog={actions.onOpenVideoDialog}
        onRemove={onRemove}
        onVideoFileChange={actions.onVideoFileChange}
        uploadingImage={actions.uploadingImage}
        uploadingVideo={actions.uploadingVideo}
        videoInputRef={actions.videoInputRef}
      />
      <div className={cn("grid", imageOnly && "[&_img]:w-full")}>
        <EditorContent editor={editor} />
      </div>
      {actions.error ? <p className="text-sm text-destructive">{actions.error}</p> : null}
    </div>
  );
}

import type { Editor } from "@tiptap/react";
import { useRichTextMediaUpload, type UploadMedia } from "./use-rich-text-media-upload";
import { useRichTextOgpInsert, type FetchOgp } from "./use-rich-text-ogp-insert";

export function useRichTextEditorActions({
  editor,
  uploadImage,
  uploadVideo,
  fetchOgp,
}: {
  editor: Editor | null;
  uploadImage: UploadMedia;
  uploadVideo: UploadMedia;
  fetchOgp: FetchOgp;
}) {
  const imageUpload = useRichTextMediaUpload({
    editor,
    type: "image",
    upload: uploadImage,
    errorLabel: "Failed to upload image",
  });
  const videoUpload = useRichTextMediaUpload({
    editor,
    type: "video",
    upload: uploadVideo,
    errorLabel: "Failed to upload video",
  });
  const { fetchingOgp, insertOgpCard, ogpError } = useRichTextOgpInsert({ editor, fetchOgp });

  return {
    fetchingOgp,
    imageInputRef: imageUpload.inputRef,
    insertOgpCard,
    onImageFileChange: imageUpload.handleFileChange,
    onOpenImageDialog: imageUpload.openFileDialog,
    onOpenVideoDialog: videoUpload.openFileDialog,
    onVideoFileChange: videoUpload.handleFileChange,
    error: imageUpload.uploadError ?? videoUpload.uploadError ?? ogpError,
    uploadingImage: imageUpload.uploading,
    uploadingVideo: videoUpload.uploading,
    videoInputRef: videoUpload.inputRef,
  };
}

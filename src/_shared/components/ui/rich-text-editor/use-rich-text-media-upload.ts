import { useRef, useState } from "react";
import type { Editor } from "@tiptap/react";

export type UploadMedia = (file: File) => Promise<string>;

type UploadMediaState = {
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  uploadError: string | null;
  uploading: boolean;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  openFileDialog: () => void;
};

function insertUploadedMedia(
  editor: Editor,
  type: "image" | "video",
  src: string,
  fileName: string,
) {
  if (type === "image") {
    editor
      .chain()
      .focus()
      .insertContent({
        attrs: {
          alt: fileName,
          src,
          title: fileName,
        },
        type: "image",
      })
      .run();
    return;
  }

  editor
    .chain()
    .focus()
    .insertContent({
      attrs: { src },
      type: "video",
    })
    .run();
}

export function useRichTextMediaUpload({
  editor,
  type,
  upload,
  errorLabel,
}: {
  editor: Editor | null;
  type: "image" | "video";
  upload: UploadMedia;
  errorLabel: string;
}): UploadMediaState {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const resetInput = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) {
      return;
    }

    setUploading(true);
    setUploadError(null);

    void upload(file)
      .then((src) => {
        insertUploadedMedia(editor, type, src, file.name);
      })
      .catch((error: unknown) => {
        setUploadError(error instanceof Error ? error.message : errorLabel);
      })
      .finally(() => {
        setUploading(false);
        resetInput();
      });
  };

  return {
    inputRef,
    uploadError,
    uploading,
    handleFileChange,
    openFileDialog: () => inputRef.current?.click(),
  };
}

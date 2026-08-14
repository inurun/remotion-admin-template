import {
  Bold,
  Heading1,
  Heading2,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Trash2,
  Video,
} from "lucide-react";
import { useEditorState, type Editor } from "@tiptap/react";
import { Button } from "@/_shared/components/ui/button";

function ToolbarButton({
  active,
  children,
  disabled,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="icon-sm"
      variant={active ? "default" : "outline"}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function selectToolbarActiveState({ editor }: { editor: Editor }) {
  return {
    isBold: editor.isActive("bold"),
    isBulletList: editor.isActive("bulletList"),
    isHeading1: editor.isActive("heading", { level: 1 }),
    isHeading2: editor.isActive("heading", { level: 2 }),
    isItalic: editor.isActive("italic"),
    isMarker: editor.isActive("marker"),
    isOrderedList: editor.isActive("orderedList"),
    isParagraph: editor.isActive("paragraph"),
  };
}

export function RichTextEditorToolbar({
  editor,
  fetchingOgp,
  imageInputRef,
  onImageFileChange,
  onInsertOgp,
  onOpenImageDialog,
  onOpenVideoDialog,
  onRemove,
  onVideoFileChange,
  uploadingImage,
  uploadingVideo,
  videoInputRef,
}: {
  editor: Editor;
  fetchingOgp: boolean;
  imageInputRef: React.MutableRefObject<HTMLInputElement | null>;
  onImageFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onInsertOgp: () => void;
  onOpenImageDialog: () => void;
  onOpenVideoDialog: () => void;
  onRemove: () => void;
  onVideoFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingImage: boolean;
  uploadingVideo: boolean;
  videoInputRef: React.MutableRefObject<HTMLInputElement | null>;
}) {
  const active = useEditorState({
    editor,
    selector: selectToolbarActiveState,
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-2">
        <ToolbarButton
          active={active.isParagraph}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Pilcrow />
        </ToolbarButton>
        <ToolbarButton
          active={active.isHeading1}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 />
        </ToolbarButton>
        <ToolbarButton
          active={active.isHeading2}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 />
        </ToolbarButton>
        <ToolbarButton
          active={active.isBold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold />
        </ToolbarButton>
        <ToolbarButton
          active={active.isItalic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </ToolbarButton>
        <ToolbarButton
          active={active.isMarker}
          onClick={() => editor.chain().focus().toggleMark("marker").run()}
        >
          <Highlighter />
        </ToolbarButton>
        <ToolbarButton
          active={active.isBulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List />
        </ToolbarButton>
        <ToolbarButton
          active={active.isOrderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </ToolbarButton>
        <ToolbarButton disabled={uploadingImage} onClick={onOpenImageDialog}>
          <ImagePlus />
        </ToolbarButton>
        <ToolbarButton disabled={uploadingVideo} onClick={onOpenVideoDialog}>
          <Video />
        </ToolbarButton>
        <ToolbarButton disabled={fetchingOgp} onClick={onInsertOgp}>
          <Link2 />
        </ToolbarButton>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={onImageFileChange}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={onVideoFileChange}
        />
      </div>
      <div className="ml-auto">
        <ToolbarButton onClick={onRemove}>
          <Trash2 />
        </ToolbarButton>
      </div>
    </div>
  );
}

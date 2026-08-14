import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import { useDebouncedCallback } from "@/_shared/hooks/use-debounced-callback";
import { TiptapImage } from "./tiptap-image";
import { TiptapMarker } from "./tiptap-marker";
import { TiptapOgCard } from "./tiptap-og-card";
import { TiptapVideo } from "./tiptap-video";
import { cn } from "@/_shared/lib/utils";

const EDITOR_CLASS_NAME = cn(
  "rich-text-editor min-h-[280px] rounded-xl border border-border break-all bg-muted/20 px-4 py-3 outline-none [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:text-2xl [&_h2]:font-semibold [&_img]:max-w-full [&_img]:rounded-xl [&_img]:shadow-md [&_li]:ml-5 [&_ol]:list-decimal [&_p]:min-h-6 [&_ul]:list-disc [&_video]:my-4 [&_video]:max-w-full [&_video]:rounded-xl",
);

const EDITOR_EXTENSIONS = [StarterKit, TiptapImage, TiptapVideo, TiptapOgCard, TiptapMarker];

const FORM_SYNC_DEBOUNCE_MS = 250;

export function useRichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const lastEmittedHtmlRef = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const { run, runImmediate } = useDebouncedCallback((html: string) => {
    if (html === lastEmittedHtmlRef.current) {
      return;
    }

    lastEmittedHtmlRef.current = html;
    onChangeRef.current(html);
  }, FORM_SYNC_DEBOUNCE_MS);

  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: value,
    immediatelyRender: false,
    // TipTap v3 default: avoid re-rendering React on every transaction.
    // Toolbar must use useEditorState instead of reading isActive during render.
    shouldRerenderOnTransaction: false,
    onUpdate: ({ editor: current }) => {
      run(current.getHTML());
    },
    onBlur: ({ editor: current }) => {
      runImmediate(current.getHTML());
    },
    editorProps: {
      attributes: {
        class: EDITOR_CLASS_NAME,
      },
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    // Skip echo from our own debounced onChange.
    if (value === lastEmittedHtmlRef.current) {
      return;
    }

    const currentHtml = editor.getHTML();
    if (currentHtml === value) {
      lastEmittedHtmlRef.current = value;
      return;
    }

    editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    lastEmittedHtmlRef.current = value || "<p></p>";
  }, [editor, value]);

  return editor;
}

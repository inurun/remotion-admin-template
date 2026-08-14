import CodeMirror from "@uiw/react-codemirror";
import type { ZenCompletionAlias } from "@/app/components/app-editor/editor-card/zen-dialog/zen-editor/zen-completion";
import { useZenEditor } from "@/app/components/app-editor/editor-card/zen-dialog/zen-editor/use-zen-editor";

export function ZenEditor({
  aliases,
  value,
  onChange,
}: {
  aliases: ZenCompletionAlias[];
  value: string;
  onChange: (value: string) => void;
}) {
  const editor = useZenEditor(aliases);

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={editor.theme}
      extensions={editor.extensions}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: true,
      }}
      className="h-full overflow-hidden rounded-lg border border-border"
      onChange={onChange}
    />
  );
}

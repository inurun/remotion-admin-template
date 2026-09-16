import CodeMirror from "@uiw/react-codemirror";
import type { ZenCompletionAlias } from "@/app/features/zen/components/zen-editor/zen-completion";
import { useZenEditor } from "@/app/features/zen/components/zen-editor/use-zen-editor";
import type { ZenAliasTarget, ZenParseError } from "@/app/features/zen/types";

export function ZenEditor({
  aliases,
  lintAliases,
  value,
  onChange,
  parseLint,
  comments,
}: {
  aliases: ZenCompletionAlias[];
  lintAliases: Map<string, ZenAliasTarget>;
  value: string;
  onChange: (value: string) => void;
  parseLint?: (source: string) => { errors: ZenParseError[] };
  comments?: Array<{ id: string; body: string }>;
}) {
  const editor = useZenEditor(aliases, lintAliases, value, onChange, parseLint, comments);

  return (
    <CodeMirror
      value={editor.doc}
      height="100%"
      theme={editor.theme}
      extensions={editor.extensions}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: true,
      }}
      className="h-full overflow-hidden rounded-lg border border-border"
      onChange={editor.handleChange}
    />
  );
}

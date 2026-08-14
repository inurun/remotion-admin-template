import { useMemo } from "react";
import { autocompletion } from "@codemirror/autocomplete";
import { EditorView } from "@codemirror/view";
import { useTheme } from "next-themes";
import {
  createZenCompletionSource,
  type ZenCompletionAlias,
} from "@/app/components/app-editor/editor-card/zen-dialog/zen-editor/zen-completion";
import { zenLanguage } from "@/app/components/app-editor/editor-card/zen-dialog/zen-editor/zen-language";

export function useZenEditor(aliases: ZenCompletionAlias[]) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? ("dark" as const) : ("light" as const);

  const extensions = useMemo(
    () => [
      zenLanguage,
      autocompletion({
        override: [createZenCompletionSource(aliases)],
      }),
      EditorView.lineWrapping,
      EditorView.theme({
        "&": {
          height: "100%",
          fontSize: "14px",
        },
        ".cm-scroller": {
          overflow: "auto",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
        },
        ".cm-content": {
          padding: "12px 0",
        },
        ".cm-gutters": {
          backgroundColor: "transparent",
          border: "none",
        },
      }),
    ],
    [aliases],
  );

  return {
    extensions,
    theme,
  };
}

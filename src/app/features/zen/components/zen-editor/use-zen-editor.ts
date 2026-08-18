import { useCallback, useMemo, useState } from "react";
import { autocompletion } from "@codemirror/autocomplete";
import { lintGutter } from "@codemirror/lint";
import { EditorView, scrollPastEnd, tooltips } from "@codemirror/view";
import { useTheme } from "next-themes";
import {
  createZenCompletionSource,
  type ZenCompletionAlias,
} from "@/app/features/zen/components/zen-editor/zen-completion";
import { createZenLinter } from "@/app/features/zen/components/zen-editor/zen-lint";
import { zenLanguage } from "@/app/features/zen/components/zen-editor/zen-language";
import type { ZenAliasTarget } from "@/app/features/zen/types";

const WRAP_GUIDE_PX = 180;

export function useZenEditor(
  aliases: ZenCompletionAlias[],
  lintAliases: Map<string, ZenAliasTarget>,
  value: string,
  onChange: (value: string) => void,
) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? ("dark" as const) : ("light" as const);
  const [doc, setDoc] = useState(value);
  const handleChange = useCallback(
    (next: string) => {
      setDoc(next);
      onChange(next);
    },
    [onChange],
  );

  const extensions = useMemo(
    () => [
      zenLanguage,
      autocompletion({
        override: [createZenCompletionSource(aliases)],
      }),
      createZenLinter(lintAliases),
      lintGutter(),
      EditorView.lineWrapping,
      scrollPastEnd(),
      EditorView.scrollMargins.of((view) => ({
        bottom: Math.round(view.dom.clientHeight * 0.35),
      })),
      tooltips({ parent: document.body }),
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
          backgroundImage: `linear-gradient(to right, transparent ${WRAP_GUIDE_PX - 1}px, color-mix(in oklab, var(--foreground) 16%, transparent) ${WRAP_GUIDE_PX - 1}px, color-mix(in oklab, var(--foreground) 16%, transparent) ${WRAP_GUIDE_PX}px, transparent ${WRAP_GUIDE_PX}px)`,
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "local",
        },
        ".cm-gutters": {
          backgroundColor: "transparent",
          border: "none",
        },
        ".cm-tooltip": {
          zIndex: 60,
        },
      }),
    ],
    [aliases, lintAliases],
  );

  return {
    doc,
    extensions,
    handleChange,
    theme,
  };
}

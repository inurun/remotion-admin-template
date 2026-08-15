import { linter, type Diagnostic } from "@codemirror/lint";
import type { EditorView } from "@codemirror/view";
import { parseZenScript } from "@/app/features/zen/parse-zen-script";
import type { ZenAliasTarget, ZenParseError } from "@/app/features/zen/types";

function toDiagnostics(view: EditorView, errors: ZenParseError[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const error of errors) {
    if (error.line <= 0 || error.line > view.state.doc.lines) {
      continue;
    }

    const line = view.state.doc.line(error.line);
    diagnostics.push({
      from: line.from,
      to: line.to,
      severity: "error",
      message: error.message,
    });
  }

  return diagnostics;
}

export function createZenLinter(aliases: Map<string, ZenAliasTarget>) {
  return linter((view) => {
    const source = view.state.doc.toString();
    if (!source.trim()) {
      return [];
    }

    return toDiagnostics(view, parseZenScript(source, { aliases }).errors);
  });
}

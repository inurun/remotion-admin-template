import { buildPageInputs } from "@/app/features/zen/build-draft-pages";
import { dropEmptyZenPages } from "@/app/features/zen/handlers/page-state";
import { createZenLineHandlers } from "@/app/features/zen/handlers/registry";
import type {
  ParseZenScriptOptions,
  ParseZenScriptResult,
  ZenParseState,
} from "@/app/features/zen/types";

export function parseZenScript(
  source: string,
  options: ParseZenScriptOptions,
): ParseZenScriptResult {
  const handlers = createZenLineHandlers(options.handlers);
  const state: ZenParseState = {
    pages: [],
    currentPage: null,
    currentSpeaker: null,
    errors: [],
    aliases: options.aliases,
  };

  const lines = source.replace(/\r\n/g, "\n").split("\n");
  for (const [index, rawLine] of lines.entries()) {
    const lineNumber = index + 1;
    const line = rawLine.trimEnd();
    if (line.trim() === "") {
      continue;
    }

    const handler = handlers.find((item) => item.match(line, state));
    if (!handler) {
      state.errors.push({ line: lineNumber, message: `Unrecognized line: ${line}` });
      continue;
    }

    handler.apply({ line, lineNumber, state });
  }

  dropEmptyZenPages(state);

  if (state.pages.length === 0 && state.errors.length === 0) {
    state.errors.push({ line: 0, message: "No pages found." });
  }

  return {
    pages: state.errors.length === 0 ? buildPageInputs(state.pages, options.aliases) : [],
    errors: state.errors,
  };
}

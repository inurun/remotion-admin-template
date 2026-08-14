import type { ZenLineHandler } from "@/app/features/zen/types";
import { extractInlineTags, uniqueTags } from "@/app/features/zen/tag-utils";

export const pageHeadingHandler: ZenLineHandler = {
  id: "page-heading",
  priority: 100,
  match: (line) => /^#\s+\S/.test(line),
  apply: ({ line, lineNumber, state }) => {
    const rest = line.replace(/^#\s+/, "");
    const { title, tags } = extractInlineTags(rest);
    if (!title) {
      state.errors.push({ line: lineNumber, message: "Page title is required." });
      return;
    }

    const page = {
      title,
      tags: uniqueTags(tags),
      speakers: [],
      lineNumber,
    };
    state.pages.push(page);
    state.currentPage = page;
    state.currentSpeaker = null;
  },
};

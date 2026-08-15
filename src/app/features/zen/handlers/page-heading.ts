import { startZenPage } from "@/app/features/zen/handlers/page-state";
import { extractInlineTags, uniqueTags } from "@/app/features/zen/tag-utils";
import type { ZenLineHandler, ZenParseState } from "@/app/features/zen/types";

function shouldStartNewPageFromHeading(state: ZenParseState) {
  const page = state.currentPage;
  if (!page) {
    return true;
  }

  return page.speakers.length > 0 || page.title !== "";
}

export const pageHeadingHandler: ZenLineHandler = {
  id: "page-heading",
  priority: 100,
  match: (line) => /^#\s+\S/.test(line),
  apply: ({ line, lineNumber, state }) => {
    const rest = line.replace(/^#\s+/, "");
    const { title, tags } = extractInlineTags(rest);
    const page = shouldStartNewPageFromHeading(state)
      ? startZenPage(state, lineNumber, title)
      : state.currentPage;

    if (!page) {
      return;
    }

    page.title = title;
    page.tags = uniqueTags([...page.tags, ...tags]);
    page.lineNumber = lineNumber;
    state.currentSpeaker = null;
  },
};

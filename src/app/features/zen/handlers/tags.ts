import type { ZenLineHandler } from "@/app/features/zen/types";
import { TAG_TOKEN_PATTERN, uniqueTags } from "@/app/features/zen/tag-utils";

function isTagsOnlyLine(line: string) {
  const tokens = line.split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => TAG_TOKEN_PATTERN.test(token));
}

export const tagsHandler: ZenLineHandler = {
  id: "tags",
  priority: 90,
  match: (line) => isTagsOnlyLine(line),
  apply: ({ line, lineNumber, state }) => {
    if (!state.currentPage) {
      state.errors.push({ line: lineNumber, message: "Tags require a page heading first." });
      return;
    }

    const tags = line
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => token.slice(1));
    state.currentPage.tags = uniqueTags([...state.currentPage.tags, ...tags]);
  },
};

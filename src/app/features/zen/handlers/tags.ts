import { ensureZenPage } from "@/app/features/zen/handlers/page-state";
import { TAG_TOKEN_PATTERN, uniqueTags } from "@/app/features/zen/tag-utils";
import type { ZenLineHandler } from "@/app/features/zen/types";

function isTagsOnlyLine(line: string) {
  const tokens = line.split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => TAG_TOKEN_PATTERN.test(token));
}

export const tagsHandler: ZenLineHandler = {
  id: "tags",
  priority: 90,
  match: (line) => isTagsOnlyLine(line),
  apply: ({ line, lineNumber, state }) => {
    const page = ensureZenPage(state, lineNumber);
    const tags = line
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => token.slice(1));
    page.tags = uniqueTags([...page.tags, ...tags]);
  },
};

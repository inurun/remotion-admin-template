import { startZenPage } from "@/app/features/zen/handlers/page-state";
import type { ZenLineHandler } from "@/app/features/zen/types";

export const PAGE_SEPARATOR_PATTERN = /^---\s*$/;

export const pageSeparatorHandler: ZenLineHandler = {
  id: "page-separator",
  priority: 110,
  match: (line) => PAGE_SEPARATOR_PATTERN.test(line),
  apply: ({ lineNumber, state }) => {
    startZenPage(state, lineNumber);
  },
};

import type { ZenDraftPage, ZenParseState } from "@/app/features/zen/types";

export function isEmptyZenPage(page: ZenDraftPage) {
  return page.title === "" && page.tags.length === 0 && page.speakers.length === 0;
}

export function createZenPage(lineNumber: number, title = ""): ZenDraftPage {
  return {
    title,
    tags: [],
    speakers: [],
    lineNumber,
  };
}

export function startZenPage(state: ZenParseState, lineNumber: number, title = "") {
  if (state.currentPage && isEmptyZenPage(state.currentPage)) {
    state.currentPage.lineNumber = lineNumber;
    state.currentPage.title = title;
    state.currentSpeaker = null;
    return state.currentPage;
  }

  const page = createZenPage(lineNumber, title);
  state.pages.push(page);
  state.currentPage = page;
  state.currentSpeaker = null;
  return page;
}

export function ensureZenPage(state: ZenParseState, lineNumber: number) {
  if (state.currentPage) {
    return state.currentPage;
  }

  return startZenPage(state, lineNumber);
}

export function dropEmptyZenPages(state: ZenParseState) {
  state.pages = state.pages.filter((page) => !isEmptyZenPage(page));
  state.currentPage = state.pages.at(-1) ?? null;
  if (!state.currentPage) {
    state.currentSpeaker = null;
  }
}

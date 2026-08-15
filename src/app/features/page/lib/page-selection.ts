import type { DraftSequenceItem } from "@/_schemas";
import { isDraftContentPage } from "@/_schemas";

export function resolveSelectedPageIndexAfterRemove(
  current: number | null,
  removedIndex: number,
  nextLength: number,
): number | null {
  if (current === null) {
    return null;
  }

  if (removedIndex !== current) {
    return shiftPageIndexAfterRemove(current, removedIndex);
  }

  return resolveReplacementPageIndex(removedIndex, nextLength);
}

function shiftPageIndexAfterRemove(current: number, removedIndex: number) {
  return current + (removedIndex < current ? -1 : 0);
}

function resolveReplacementPageIndex(removedIndex: number, nextLength: number) {
  return nextLength === 0 ? null : Math.min(removedIndex, nextLength - 1);
}

export function resolvePageIndexFromFieldCount(
  current: number | null,
  pageCount: number,
): number | null {
  if (pageCount === 0) {
    return null;
  }

  if (current === null) {
    return 0;
  }

  return current < pageCount ? current : pageCount - 1;
}

export function resolveInsertPageIndex(selectedPageIndex: number | null, pageCount: number) {
  if (selectedPageIndex === null) {
    return pageCount;
  }

  return selectedPageIndex + 1;
}

export function getLandingPageTtsCount(
  pageFields: DraftSequenceItem[],
  removedPageIndex: number,
  nextPageIndex: number | null,
): number {
  if (nextPageIndex === null) {
    return 0;
  }

  const oldPageIndex = nextPageIndex < removedPageIndex ? nextPageIndex : nextPageIndex + 1;
  const landing = pageFields[oldPageIndex];
  if (!landing || !isDraftContentPage(landing)) {
    return 0;
  }

  return landing.tts.length;
}

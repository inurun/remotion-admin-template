import type { PageType, SavedProject, TransitionVariant } from "@/_schemas";
import { getProjectSequenceTimings } from "@/_shared/project/project-timing";
import { moveItem } from "@/app/features/ui/lib/reorder";

export type PageListItemPresentation =
  | {
      kind: "page";
      pageType: PageType;
      title: string | null;
    }
  | {
      kind: "transition";
      variant: TransitionVariant;
    };

type PageListItemSource =
  | {
      type: PageType;
      title: string;
    }
  | {
      type: "transition";
      variant: TransitionVariant;
    };

export function resolvePageListItemPresentation(
  item: PageListItemSource | undefined,
): PageListItemPresentation | null {
  if (!item) {
    return null;
  }

  if (item.type === "transition") {
    return { kind: "transition", variant: item.variant };
  }

  const title = item.title.trim();
  return {
    kind: "page",
    pageType: item.type,
    title: title === "" ? null : title,
  };
}

type PageTiming = {
  id?: string;
  startSec: number;
  endSec: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getPageThumbnailFrame(page: PageTiming, fps: number, durationInFrames: number) {
  const lastProjectFrame = Math.max(0, durationInFrames - 1);
  const pageStartFrame = clamp(Math.round(page.startSec * fps), 0, lastProjectFrame);
  const pageEndFrame = Math.max(
    pageStartFrame,
    clamp(Math.ceil(page.endSec * fps) - 1, pageStartFrame, lastProjectFrame),
  );
  const preferredFrame = Math.round((page.startSec + 1) * fps);

  return clamp(preferredFrame, pageStartFrame, pageEndFrame);
}

export function getProjectPageTimings(project: SavedProject): PageTiming[] {
  return getProjectSequenceTimings(project);
}

function resolveSelectedPageIndexAfterMove(
  pageIds: string[],
  selectedPageIndex: number | null,
  fromIndex: number,
  toIndex: number,
) {
  if (selectedPageIndex === null) {
    return null;
  }

  const selectedPageId = pageIds[selectedPageIndex];
  if (!selectedPageId) {
    return null;
  }

  return moveItem(pageIds, fromIndex, toIndex).findIndex((id) => id === selectedPageId);
}

function isPageIndexInRange(pageCount: number, index: number) {
  return index >= 0 && index < pageCount;
}

function canMovePage(pageCount: number, fromIndex: number, toIndex: number) {
  return (
    fromIndex !== toIndex &&
    isPageIndexInRange(pageCount, fromIndex) &&
    isPageIndexInRange(pageCount, toIndex)
  );
}

export function getPageMoveState(
  pageIds: string[],
  selectedPageIndex: number | null,
  fromIndex: number,
  toIndex: number,
) {
  if (!canMovePage(pageIds.length, fromIndex, toIndex)) {
    return null;
  }

  return {
    fromIndex,
    toIndex,
    nextSelectedPageIndex: resolveSelectedPageIndexAfterMove(
      pageIds,
      selectedPageIndex,
      fromIndex,
      toIndex,
    ),
  };
}

export const PAGE_LIST_STAGGER_STEP_MS = 100;
export const PAGE_LIST_STAGGER_MAX_MS = 400;

export function getPageListStaggerDelayMs(index: number) {
  return Math.min(Math.max(index, 0) * PAGE_LIST_STAGGER_STEP_MS, PAGE_LIST_STAGGER_MAX_MS);
}

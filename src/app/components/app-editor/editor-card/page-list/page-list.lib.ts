import type { PageType, SavedTimeline, TransitionVariant } from "@/_schemas";
import { SEQUENCE_TRACK_ID } from "@/_schemas";
import { moveItem } from "@/app/features/ui/lib/reorder";

export type PageListItemPresentation =
  | {
      kind: "page";
      pageType: PageType;
      title: string | null;
      ttsCount: number;
    }
  | {
      kind: "transition";
      variant: TransitionVariant;
    };

type PageListItemSource =
  | {
      type: PageType;
      title: string;
      tts: unknown[];
    }
  | {
      type: "transition";
      variant: TransitionVariant;
    };

export const PAGE_TYPE_THUMBNAIL_GRADIENT: Record<PageType, string> = {
  intro: "linear-gradient(in oklch 120deg, #4ba3f7 0%, #1d4ed8 100%)",
  "eyecatch-text": "linear-gradient(in oklch 120deg, #c4b5fd 0%, #9d2398 100%)",
  main: "linear-gradient(in oklch 120deg, #94a3b8 0%, #334155 100%)",
  comments: "linear-gradient(in oklch 120deg, #fbbf24 0%, #c2410c 100%)",
  outro: "linear-gradient(in oklch 120deg, #34d399 0%, #0f766e 100%)",
  endcard: "linear-gradient(in oklch 120deg, #fb7185 0%, #9f1239 100%)",
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
    ttsCount: item.tts.length,
  };
}

type PageTiming = {
  id?: string;
  startSec: number;
  endSec: number;
};

export function getProjectPageTimings(timeline: SavedTimeline): PageTiming[] {
  return (timeline.tracks.find((track) => track.id === SEQUENCE_TRACK_ID)?.clips ?? []).map(
    (clip) => ({
      id: clip.id,
      startSec: clip.startSec,
      endSec: clip.startSec + clip.durationSec,
    }),
  );
}

export function getPlayingPageId(pages: PageTiming[], currentFrame: number, fps: number) {
  if (pages.length === 0) {
    return null;
  }

  const currentSec = currentFrame / fps;
  let lastContainingId: string | null = null;
  let lastStartedId: string | null = null;

  for (const page of pages) {
    if (!page.id) {
      continue;
    }
    if (page.startSec <= currentSec) {
      lastStartedId = page.id;
    }
    if (page.startSec <= currentSec && currentSec < page.endSec) {
      lastContainingId = page.id;
    }
  }

  return lastContainingId ?? lastStartedId ?? pages[0]?.id ?? null;
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

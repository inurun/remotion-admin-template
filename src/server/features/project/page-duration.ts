import {
  isSavedContentPage,
  isSavedTransition,
  type SavedPage,
  type SavedSequenceItem,
} from "@/_schemas";
import { VIDEO_FPS } from "@/constants";
import { getTransitionDurationSec } from "@/remotion/transitions/variants";
import {
  OUTRO_BLOCKS_PER_PAGE,
  OUTRO_CARDS_DELAY_SEC,
  OUTRO_PAPER_FADE_OUT_SEC,
  OUTRO_PAPER_HOLD_AFTER_PAGE_SEC,
  OUTRO_PAGE_DURATION_SEC,
} from "@/_shared/lib/outro/outro-timing";
import { ENDCARD_DURATION_SEC } from "@/_shared/lib/endcard/endcard-timing";
import { EYECATCH_TEXT_MIN_DURATION_SEC } from "@/_shared/lib/page/page-timing";
import {
  contentPageHasUnresolvedAudio,
  contentPageHasUnresolvedTts,
  listReadyTtsTimingInputs,
} from "@/_shared/lib/tts/tts-audio";
import { createTtsTimingSegments, getTtsTimingEndSec } from "@/_shared/lib/tts/tts-timing";
import { secondsToFrames } from "@/remotion/utils/timing";

export const AUDIO_PADDING_SECONDS = 0.1;
export const MIN_TTS_DURATION_SECONDS = 1 / VIDEO_FPS;

function getOutroContentDurationSec(blockCount: number) {
  const pageCount = Math.ceil(blockCount / OUTRO_BLOCKS_PER_PAGE);
  if (pageCount <= 0) {
    return 0;
  }

  return (
    OUTRO_CARDS_DELAY_SEC +
    pageCount * OUTRO_PAGE_DURATION_SEC +
    OUTRO_PAPER_HOLD_AFTER_PAGE_SEC +
    OUTRO_PAPER_FADE_OUT_SEC
  );
}

function sequenceDurationInFrames(durationSec: number) {
  return Math.max(1, secondsToFrames(durationSec, VIDEO_FPS));
}

export function getAdjacentTransitionSec(pages: SavedSequenceItem[], index: number) {
  let adjacentSec = 0;
  const previous = pages[index - 1];
  const next = pages[index + 1];
  if (previous && isSavedTransition(previous)) {
    adjacentSec = Math.max(adjacentSec, getTransitionDurationSec(previous.variant));
  }
  if (next && isSavedTransition(next)) {
    adjacentSec = Math.max(adjacentSec, getTransitionDurationSec(next.variant));
  }
  return adjacentSec;
}

export function computeFixedPageDurationSec(page: SavedPage) {
  if (page.type === "outro") {
    return Math.max(
      MIN_TTS_DURATION_SECONDS,
      getOutroContentDurationSec(page.meta.blocks.length) + page.padBeforeSec + page.padAfterSec,
    );
  }

  if (page.type === "endcard") {
    return Math.max(
      MIN_TTS_DURATION_SECONDS,
      ENDCARD_DURATION_SEC + page.padBeforeSec + page.padAfterSec,
    );
  }

  return null;
}

export function computeReadyPageDurationSec(page: SavedPage) {
  const fixed = computeFixedPageDurationSec(page);
  if (fixed !== null) {
    return fixed;
  }

  const ttsDurationSec = getTtsTimingEndSec(
    createTtsTimingSegments(listReadyTtsTimingInputs(page.tts), {
      minDurationSec: MIN_TTS_DURATION_SECONDS,
    }),
  );

  if (page.type === "eyecatch-text") {
    return Math.max(EYECATCH_TEXT_MIN_DURATION_SEC, ttsDurationSec);
  }

  return Math.max(MIN_TTS_DURATION_SECONDS, ttsDurationSec + page.padBeforeSec + page.padAfterSec);
}

export function computeProvisionalPageDurationSec(page: SavedPage, adjacentTransitionSec: number) {
  const fixed = computeFixedPageDurationSec(page);
  if (fixed !== null) {
    return Math.max(fixed, adjacentTransitionSec);
  }

  if (page.type === "eyecatch-text") {
    return Math.max(EYECATCH_TEXT_MIN_DURATION_SEC, adjacentTransitionSec);
  }

  return Math.max(
    MIN_TTS_DURATION_SECONDS,
    page.padBeforeSec + page.padAfterSec,
    adjacentTransitionSec,
  );
}

export function resolveSavePageDurationSec(input: {
  page: SavedPage;
  previousDurationSec?: number;
  adjacentTransitionSec: number;
}) {
  if (contentPageHasUnresolvedTts(input.page)) {
    if (input.previousDurationSec !== undefined) {
      return input.previousDurationSec;
    }
    return computeProvisionalPageDurationSec(input.page, input.adjacentTransitionSec);
  }

  return computeReadyPageDurationSec(input.page);
}

export function withSavedPageDurations(
  pages: SavedSequenceItem[],
  previousById: Map<string, SavedSequenceItem>,
) {
  return pages.map((item, index) => {
    if (!isSavedContentPage(item)) {
      return item;
    }

    const previous = previousById.get(item.id);
    return {
      ...item,
      durationSec: resolveSavePageDurationSec({
        page: item,
        previousDurationSec:
          previous && isSavedContentPage(previous) ? previous.durationSec : undefined,
        adjacentTransitionSec: getAdjacentTransitionSec(pages, index),
      }),
    };
  });
}

export function withSettledPageDurations(pages: SavedSequenceItem[], affectedPageIds: Set<string>) {
  return pages.map((item, index) => {
    if (!isSavedContentPage(item) || !affectedPageIds.has(item.id)) {
      return item;
    }

    if (contentPageHasUnresolvedAudio(item)) {
      return item;
    }

    return {
      ...item,
      durationSec: Math.max(
        computeReadyPageDurationSec(item),
        getAdjacentTransitionSec(pages, index),
      ),
    };
  });
}

export function clampPagesToAdjacentTransitions(pages: SavedSequenceItem[]) {
  return pages.map((item, index) => {
    if (!isSavedContentPage(item)) {
      return item;
    }

    const adjacentTransitionSec = getAdjacentTransitionSec(pages, index);
    return {
      ...item,
      durationSec: Math.max(item.durationSec, adjacentTransitionSec),
    };
  });
}

export function sequenceHasUnresolvedTts(pages: SavedSequenceItem[]) {
  return pages.some((item) => isSavedContentPage(item) && contentPageHasUnresolvedTts(item));
}

export function validateTransitionSequenceDurations(pages: SavedSequenceItem[]) {
  for (let index = 0; index < pages.length; index += 1) {
    const item = pages[index];
    if (!item || !isSavedTransition(item)) {
      continue;
    }

    const transitionFrames = sequenceDurationInFrames(getTransitionDurationSec(item.variant));
    const neighbors = [pages[index - 1], pages[index + 1]];

    for (const neighbor of neighbors) {
      if (!neighbor || !isSavedContentPage(neighbor)) {
        continue;
      }

      const pageFrames = sequenceDurationInFrames(neighbor.durationSec);
      if (pageFrames < transitionFrames) {
        throw new Error(
          `page ${neighbor.id} (${pageFrames} frames) must be at least as long as adjacent transition ${item.id} (${transitionFrames} frames)`,
        );
      }
    }
  }
}

export function finalizeSequenceDurations(pages: SavedSequenceItem[]) {
  if (sequenceHasUnresolvedTts(pages)) {
    return clampPagesToAdjacentTransitions(pages);
  }

  validateTransitionSequenceDurations(pages);
  return pages;
}

import type {
  SavedPage,
  SavedProject,
  SavedSequenceItem,
  SavedTimeline,
  SavedTimelineClip,
  SavedTts,
  TransitionVariant,
} from "@/_schemas";
import { SEQUENCE_TRACK_ID, savedTimelineSchema } from "@/_schemas";
import {
  ENDCARD_DURATION_SEC,
  EYECATCH_TEXT_MIN_DURATION_SEC,
  MIN_TTS_DURATION_SECONDS,
  OUTRO_BLOCKS_PER_PAGE,
  OUTRO_CARDS_DELAY_SEC,
  OUTRO_PAGE_DURATION_SEC,
  OUTRO_PAPER_FADE_OUT_SEC,
  OUTRO_PAPER_HOLD_AFTER_PAGE_SEC,
  TRANSITION_DURATION_SEC,
} from "@/constants";

function isContentPage(item: SavedSequenceItem): item is SavedPage {
  return item.type !== "transition";
}

function ttsIsUnresolved(tts: SavedTts) {
  return (
    tts.audio.status === "analyzing" ||
    tts.audio.status === "pending" ||
    tts.audio.status === "failed"
  );
}

function pageHasUnresolvedTts(page: SavedPage) {
  return page.tts.some(ttsIsUnresolved);
}

function transitionDurationSec(variant: TransitionVariant) {
  return TRANSITION_DURATION_SEC[variant];
}

function nestedEndSec(clips: SavedTimelineClip[]) {
  return clips.reduce((endSec, clip) => Math.max(endSec, clip.startSec + clip.durationSec), 0);
}

function createOutroVisualClips(blockCount: number): SavedTimelineClip[] {
  const pageCount = Math.ceil(blockCount / OUTRO_BLOCKS_PER_PAGE);
  return Array.from({ length: pageCount }, (_, index) => ({
    id: `outro-page-${index}`,
    startSec: OUTRO_CARDS_DELAY_SEC + index * OUTRO_PAGE_DURATION_SEC,
    durationSec: OUTRO_PAGE_DURATION_SEC,
    clips: [],
  }));
}

function createEndcardVisualClips(advertiserCount: number): SavedTimelineClip[] {
  const pageCount = Math.max(1, advertiserCount);
  const step = ENDCARD_DURATION_SEC - TRANSITION_DURATION_SEC.slide;
  return Array.from({ length: pageCount }, (_, index) => ({
    id: `endcard-page-${index}`,
    startSec: index * step,
    durationSec: ENDCARD_DURATION_SEC,
    clips: [],
  }));
}

function createVisualClips(page: SavedPage): SavedTimelineClip[] {
  if (page.type === "outro") {
    return createOutroVisualClips(page.meta.blocks.length);
  }
  if (page.type === "endcard") {
    return createEndcardVisualClips(page.meta.advertisers.length);
  }
  return [];
}

function createTtsClips(page: SavedPage, readyOnly: boolean) {
  const clips: SavedTimelineClip[] = [];
  let cursor = 0;

  for (const tts of page.tts) {
    const ready = tts.audio.status === "ready";
    if (readyOnly && !ready) {
      continue;
    }

    const audioDurationSec = tts.audio.status === "ready" ? tts.audio.durationSec : 0;
    const startSec = cursor + tts.padBeforeSec;
    const durationSec = Math.max(MIN_TTS_DURATION_SECONDS, audioDurationSec + tts.padAfterSec);
    clips.push({
      id: tts.id,
      startSec: page.padBeforeSec + startSec,
      durationSec,
      clips: [],
    });
    cursor = startSec + durationSec;
  }

  return { clips, ttsEndSec: cursor };
}

function createPageClips(page: SavedPage) {
  return [...createTtsClips(page, false).clips, ...createVisualClips(page)];
}

function getOutroHoldFadeSec() {
  return OUTRO_PAPER_HOLD_AFTER_PAGE_SEC + OUTRO_PAPER_FADE_OUT_SEC;
}

function getReadyPageDurationSec(page: SavedPage) {
  const visualClips = createVisualClips(page);
  const visualEndSec = nestedEndSec(visualClips);

  if (page.type === "outro") {
    const contentSec = visualClips.length === 0 ? 0 : visualEndSec + getOutroHoldFadeSec();
    return Math.max(
      MIN_TTS_DURATION_SECONDS,
      contentSec + page.padBeforeSec + page.padAfterSec,
      visualEndSec,
    );
  }

  if (page.type === "endcard") {
    return Math.max(
      MIN_TTS_DURATION_SECONDS,
      visualEndSec + page.padBeforeSec + page.padAfterSec,
      visualEndSec,
    );
  }

  const { ttsEndSec } = createTtsClips(page, true);

  if (page.type === "eyecatch-text") {
    return Math.max(EYECATCH_TEXT_MIN_DURATION_SEC, ttsEndSec);
  }

  return Math.max(MIN_TTS_DURATION_SECONDS, ttsEndSec + page.padBeforeSec + page.padAfterSec);
}

function getProvisionalPageDurationSec(page: SavedPage, adjacentTransitionSec: number) {
  if (page.type === "outro" || page.type === "endcard") {
    return Math.max(getReadyPageDurationSec(page), adjacentTransitionSec);
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

function getAdjacentTransitionSec(pages: SavedSequenceItem[], index: number) {
  let adjacentSec = 0;
  const previous = pages[index - 1];
  const next = pages[index + 1];
  if (previous && previous.type === "transition") {
    adjacentSec = Math.max(adjacentSec, transitionDurationSec(previous.variant));
  }
  if (next && next.type === "transition") {
    adjacentSec = Math.max(adjacentSec, transitionDurationSec(next.variant));
  }
  return adjacentSec;
}

function sequenceClips(timeline: SavedTimeline | undefined) {
  return timeline?.tracks.find((track) => track.id === SEQUENCE_TRACK_ID)?.clips ?? [];
}

function getPageDurationSec(input: {
  page: SavedPage;
  index: number;
  pages: SavedSequenceItem[];
  previousById: Map<string, SavedTimelineClip>;
}) {
  const adjacentTransitionSec = getAdjacentTransitionSec(input.pages, input.index);

  if (pageHasUnresolvedTts(input.page)) {
    const previous = input.previousById.get(input.page.id);
    if (previous) {
      return Math.max(previous.durationSec, adjacentTransitionSec);
    }
    return getProvisionalPageDurationSec(input.page, adjacentTransitionSec);
  }

  return Math.max(getReadyPageDurationSec(input.page), adjacentTransitionSec);
}

export function toTimeline(project: SavedProject, previous?: SavedTimeline): SavedTimeline {
  const previousById = new Map(sequenceClips(previous).map((clip) => [clip.id, clip]));
  const clips: SavedTimelineClip[] = [];
  let pageDurSum = 0;
  let transitionDurSum = 0;

  for (const [index, item] of project.pages.entries()) {
    if (isContentPage(item)) {
      const durationSec = getPageDurationSec({
        page: item,
        index,
        pages: project.pages,
        previousById,
      });
      const startSec = pageDurSum - transitionDurSum;
      clips.push({
        id: item.id,
        startSec,
        durationSec,
        clips: createPageClips(item),
      });
      pageDurSum += durationSec;
      continue;
    }

    const durationSec = transitionDurationSec(item.variant);
    const cutSec = pageDurSum - transitionDurSum;
    clips.push({
      id: item.id,
      startSec: cutSec - durationSec,
      durationSec,
      clips: [],
    });
    transitionDurSum += durationSec;
  }

  return savedTimelineSchema.parse({
    durationSec: Math.max(0, pageDurSum - transitionDurSum),
    tracks: [{ id: SEQUENCE_TRACK_ID, clips }],
  });
}

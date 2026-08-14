import type { SavedProject } from "@/_schemas";
import { isSavedContentPage, isSavedTransition } from "@/_schemas";
import { createTtsTimingSegments } from "@/_shared/lib/tts/tts-timing";
import { getTransitionDurationSec } from "@/remotion/transitions/variants";
import { secondsToFrames } from "@/remotion/utils/timing";

export interface DuckableInterval {
  from: number;
  to: number;
}

function collectTtsIntervals(project: SavedProject, fps: number): DuckableInterval[] {
  const intervals: DuckableInterval[] = [];
  let pageStartFrame = 0;

  for (const item of project.pages) {
    if (isSavedTransition(item)) {
      pageStartFrame -= Math.max(1, secondsToFrames(getTransitionDurationSec(item.variant), fps));
      continue;
    }

    if (!isSavedContentPage(item)) {
      continue;
    }

    const pageDurationFrames = Math.max(1, secondsToFrames(item.durationSec, fps));

    for (const segment of createTtsTimingSegments(item.tts, { minDurationSec: 1 / fps })) {
      const from = pageStartFrame + secondsToFrames(item.padBeforeSec + segment.startSec, fps);
      const duration = secondsToFrames(segment.durationSec, fps);
      if (duration > 0) {
        intervals.push({ from, to: from + duration });
      }
    }

    pageStartFrame += pageDurationFrames;
  }

  return intervals;
}

export function collectDuckableIntervals(project: SavedProject, fps: number): DuckableInterval[] {
  return [...collectTtsIntervals(project, fps)];
}

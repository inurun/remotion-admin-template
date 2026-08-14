import type { SavedProject, SavedSequenceItem } from "@/_schemas";
import { isSavedContentPage, isSavedTransition } from "@/_schemas";
import { getTransitionDurationSec } from "@/remotion/transitions/variants";

export type SequenceItemTiming = {
  id: string;
  startSec: number;
  endSec: number;
};

function getItemDurationSec(item: SavedSequenceItem): number {
  if (isSavedTransition(item)) {
    return getTransitionDurationSec(item.variant);
  }
  return item.durationSec;
}

export function calculateProjectDurationSec(project: SavedProject): number {
  let pageDurSum = 0;
  let transitionDurSum = 0;

  for (const item of project.pages) {
    if (isSavedContentPage(item)) {
      pageDurSum += item.durationSec;
    } else {
      transitionDurSum += getTransitionDurationSec(item.variant);
    }
  }

  return Math.max(0, pageDurSum - transitionDurSum);
}

export function getProjectSequenceTimings(project: SavedProject): SequenceItemTiming[] {
  let pageDurSum = 0;
  let transitionDurSum = 0;
  const timings: SequenceItemTiming[] = [];

  for (const item of project.pages) {
    if (isSavedContentPage(item)) {
      const startSec = pageDurSum - transitionDurSum;
      const endSec = startSec + item.durationSec;
      timings.push({ id: item.id, startSec, endSec });
      pageDurSum += item.durationSec;
      continue;
    }

    if (isSavedTransition(item)) {
      const durationSec = getItemDurationSec(item);
      const cutSec = pageDurSum - transitionDurSum;
      const startSec = cutSec - durationSec;
      timings.push({ id: item.id, startSec, endSec: cutSec });
      transitionDurSum += durationSec;
    }
  }

  return timings;
}

import {
  SEQUENCE_TRACK_ID,
  type SavedProject,
  type SavedTimeline,
  type SavedTimelineClip,
} from "@/_schemas";
import { secondsToFrames } from "@/remotion/utils/timing";

export interface DuckableInterval {
  from: number;
  to: number;
}

function collectClipIntervals(
  clips: SavedTimelineClip[],
  originSec: number,
  readyTtsIds: Set<string>,
  fps: number,
): DuckableInterval[] {
  return clips.flatMap((clip) => {
    const startSec = originSec + clip.startSec;
    const nested = collectClipIntervals(clip.clips, startSec, readyTtsIds, fps);
    if (!readyTtsIds.has(clip.id)) {
      return nested;
    }
    const duration = secondsToFrames(clip.durationSec, fps);
    if (duration <= 0) {
      return nested;
    }
    const from = secondsToFrames(startSec, fps);
    return [{ from, to: from + duration }, ...nested];
  });
}

export function collectDuckableIntervals(
  project: SavedProject,
  timeline: SavedTimeline,
  fps: number,
): DuckableInterval[] {
  const readyTtsIds = new Set(
    project.pages.flatMap((item) => {
      if (item.type === "transition") {
        return [];
      }
      return item.tts.flatMap((tts) => (tts.audio.status === "ready" ? [tts.id] : []));
    }),
  );

  return collectClipIntervals(
    timeline.tracks.find((track) => track.id === SEQUENCE_TRACK_ID)?.clips ?? [],
    0,
    readyTtsIds,
    fps,
  );
}

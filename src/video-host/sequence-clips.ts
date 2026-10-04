import { SEQUENCE_TRACK_ID, type SavedTimeline, type SavedTimelineClip } from "@/_schemas";

export function getSequenceClips(timeline: SavedTimeline): SavedTimelineClip[] {
  return timeline.tracks.find((track) => track.id === SEQUENCE_TRACK_ID)?.clips ?? [];
}

export function getPageClip(
  timeline: SavedTimeline,
  pageId: string,
): SavedTimelineClip | undefined {
  return getSequenceClips(timeline).find((clip) => clip.id === pageId);
}

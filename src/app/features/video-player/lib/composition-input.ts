import type { SavedProject, SavedSchedules, SavedTimeline } from "@/_schemas";
import type { HfData } from "@/video-host/contract";

const EMPTY_SCHEDULES: SavedSchedules = { items: [] };

export function buildVideoInputProps(input: {
  project: SavedProject;
  timeline: SavedTimeline;
  schedules?: SavedSchedules;
}): HfData {
  return {
    project: input.project,
    timeline: input.timeline,
    schedules: input.schedules ?? EMPTY_SCHEDULES,
  };
}

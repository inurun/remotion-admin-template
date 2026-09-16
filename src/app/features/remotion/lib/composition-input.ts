import type { SavedProject, SavedSchedules, SavedTimeline } from "@/_schemas";
import type { RemotionCompositionProps } from "@/remotion/core/context";

const EMPTY_SCHEDULES: SavedSchedules = { items: [] };

export function buildRemotionInputProps(input: {
  project: SavedProject;
  timeline: SavedTimeline;
  schedules?: SavedSchedules;
}): RemotionCompositionProps {
  return {
    project: input.project,
    timeline: input.timeline,
    schedules: input.schedules ?? EMPTY_SCHEDULES,
  };
}

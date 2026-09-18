import {
  TIMELINE_LANE_HEIGHT_PX,
  getClipBarBackground,
  getClipBarClassName,
  getClipBarStyle,
  type TimelineLane,
} from "@/app/components/app-editor/timeline-view/timeline-view.lib";

type UseTimelineTracksParams = {
  lanes: TimelineLane[];
  pixelsPerSecond: number;
};

export function useTimelineTracks({ lanes, pixelsPerSecond }: UseTimelineTracksParams) {
  return {
    lanes: lanes.map((lane) => ({
      ...lane,
      clips: lane.clips.map((clip) => ({
        ...clip,
        barClassName: getClipBarClassName(clip),
        barStyle: {
          ...getClipBarStyle(clip, pixelsPerSecond),
          backgroundImage: getClipBarBackground(clip),
          height: TIMELINE_LANE_HEIGHT_PX - 6,
        },
      })),
    })),
    laneHeight: TIMELINE_LANE_HEIGHT_PX,
  };
}

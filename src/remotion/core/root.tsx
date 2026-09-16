import { Composition } from "remotion";
import {
  DEFAULT_PROJECT_META,
  DEFAULT_VOICE_PRESETS,
  EMPTY_TIMELINE,
  savedProjectSchema,
  savedTimelineSchema,
  type SavedTimeline,
} from "@/_schemas";
import { COMP_NAME, VIDEO_FPS } from "@/constants";
import projectJson from "../../../data/project.json";
import timelineJson from "../../../data/project.timeline.json";
import { Composition as RemotionVideo } from "./composition";
import { secondsToFrames } from "../utils/timing";

function calculateDurationInFrames(timeline: SavedTimeline) {
  return Math.max(1, secondsToFrames(timeline.durationSec, VIDEO_FPS));
}

export function RemotionRoot() {
  return (
    <Composition
      id={COMP_NAME}
      component={RemotionVideo}
      fps={VIDEO_FPS}
      width={DEFAULT_PROJECT_META.width}
      height={DEFAULT_PROJECT_META.height}
      defaultProps={{
        project: {
          meta: DEFAULT_PROJECT_META,
          pages: [],
          bgm: [],
          voicePresets: DEFAULT_VOICE_PRESETS,
        },
        timeline: EMPTY_TIMELINE,
      }}
      calculateMetadata={({ props }) => {
        const project = savedProjectSchema.parse(
          props.project.pages.length > 0 ? props.project : projectJson,
        );
        const timeline = savedTimelineSchema.parse(
          props.timeline.tracks.some((track) => track.clips.length > 0)
            ? props.timeline
            : timelineJson,
        );
        return {
          props: { project, timeline },
          durationInFrames: calculateDurationInFrames(timeline),
          width: project.meta.width,
          height: project.meta.height,
        };
      }}
    />
  );
}

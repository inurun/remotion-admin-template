import { Composition } from "remotion";
import { savedProjectSchema, type SavedProject } from "@/_schemas";
import { calculateProjectDurationSec } from "@/_shared/project/project-timing";
import { getDefaultProjectMeta } from "@/_shared/project/project-meta";
import { getDefaultVoicePresets } from "@/_shared/project/default-voice-presets";
import { COMP_NAME, VIDEO_FPS } from "@/constants";
import projectJson from "../../../data/project.json";
import { Composition as RemotionVideo } from "./composition";
import { secondsToFrames } from "../utils/timing";

function calculateDurationInFrames(project: SavedProject) {
  return Math.max(1, secondsToFrames(calculateProjectDurationSec(project), VIDEO_FPS));
}

export function RemotionRoot() {
  return (
    <Composition
      id={COMP_NAME}
      component={RemotionVideo}
      fps={VIDEO_FPS}
      width={getDefaultProjectMeta().width}
      height={getDefaultProjectMeta().height}
      defaultProps={{
        project: {
          meta: getDefaultProjectMeta(),
          pages: [],
          bgm: [],
          voicePresets: getDefaultVoicePresets(),
        },
      }}
      calculateMetadata={({ props }) => {
        const project = savedProjectSchema.parse(
          props.project.pages.length > 0 ? props.project : projectJson,
        );
        const durationInFrames = calculateDurationInFrames(project);
        return {
          props: { project },
          durationInFrames,
          width: project.meta.width,
          height: project.meta.height,
        };
      }}
    />
  );
}

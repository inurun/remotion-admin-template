import { useMemo, useState, type ComponentType } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { DraftProject, SavedProject } from "@/_schemas";
import { calculateProjectDurationSec } from "@/_shared/project/project-timing";
import { normalizeProjectMeta } from "@/_shared/project/project-meta";
import { VIDEO_FPS } from "@/constants";
import { useProject } from "@/app/features/project";
import { useRemotionComposition } from "@/app/features/remotion/hook/use-remotion-composition";
import {
  DEFAULT_PREVIEW_PLAYBACK_RATE,
  type PreviewPlaybackRate,
} from "@/app/components/app-editor/preview-card/preview-card.lib";

export function usePreviewCard() {
  const { project } = useProject();
  const { control } = useFormContext<DraftProject>();
  const meta = useWatch({ control, name: "meta" });
  const component = useRemotionComposition();
  const previewProject = useMemo(() => {
    return {
      ...project,
      meta: normalizeProjectMeta(meta),
    };
  }, [meta, project]);
  const durationInFrames = useMemo(() => {
    return Math.max(1, Math.ceil(calculateProjectDurationSec(project) * VIDEO_FPS));
  }, [project]);

  return {
    component,
    durationInFrames,
    previewProject,
  };
}

export function usePreviewPlayerArea() {
  const [playbackRate, setPlaybackRate] = useState<PreviewPlaybackRate>(
    DEFAULT_PREVIEW_PLAYBACK_RATE,
  );

  return {
    playbackRate,
    setPlaybackRate,
  };
}

export type PreviewPlayerAreaProps = {
  component: ComponentType<{ project: SavedProject }>;
  durationInFrames: number;
  project: SavedProject;
};

import { useMemo, useState, type ComponentType } from "react";
import type { SavedProject, SavedTimeline } from "@/_schemas";
import { VIDEO_FPS } from "@/constants";
import { useRemotionComposition } from "@/app/features/remotion/hook/use-remotion-composition";
import { reconstructSavedProject } from "@/app/features/editor/store/saved-project-state";
import {
  useSavedProject,
  useSavedProjectStoreApi,
} from "@/app/features/editor/store/saved-project-store-context";
import {
  DEFAULT_PREVIEW_PLAYBACK_RATE,
  type PreviewPlaybackRate,
} from "@/app/components/app-editor/preview-card/preview-card.lib";

export function usePreviewCard() {
  const component = useRemotionComposition();
  const savedStore = useSavedProjectStoreApi();
  const renderRevision = useSavedProject((state) => state.renderRevision);
  const sequenceOrder = useSavedProject((state) => state.sequenceOrder);
  const projectSettings = useSavedProject((state) => state.project);
  const itemsById = useSavedProject((state) => state.itemsById);
  const timeline = useSavedProject((state) => state.timeline);
  const previewProject = useMemo(
    () => reconstructSavedProject(savedStore.getState()),
    [itemsById, projectSettings, renderRevision, savedStore, sequenceOrder],
  );
  const durationInFrames = useMemo(() => {
    return Math.max(1, Math.ceil(timeline.durationSec * VIDEO_FPS));
  }, [timeline]);

  return {
    component,
    durationInFrames,
    previewProject,
    timeline,
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
  component: ComponentType<{ project: SavedProject; timeline: SavedTimeline }>;
  durationInFrames: number;
  project: SavedProject;
  timeline: SavedTimeline;
};

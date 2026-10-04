import { useMemo, useState } from "react";
import type { SavedProject, SavedSchedules, SavedTimeline } from "@/_schemas";
import { VIDEO_FPS } from "@/constants";
import { getTimelineDurationInFrames } from "@/video-host/constants";
import { reconstructSavedProject } from "@/app/features/editor/store/saved-project-state";
import {
  useSavedProject,
  useSavedProjectStoreApi,
} from "@/app/features/editor/store/saved-project-store-context";
import { useProjectRoute } from "@/app/features/project/context/project-route-context";
import { useSelectedProjectQuery } from "@/app/features/project/swr/use-project-queries";
import {
  DEFAULT_PREVIEW_PLAYBACK_RATE,
  type PreviewPlaybackRate,
} from "@/app/components/app-editor/preview-card/preview-card.lib";
import { useSchedulesQuery } from "@/app/features/schedule/swr/use-schedule-queries";

export function usePreviewCard() {
  const { projectPath } = useProjectRoute();
  // The iframe URL depends on the duration: wait for the real timeline instead of loading twice.
  const { hasData } = useSelectedProjectQuery(projectPath);
  const savedStore = useSavedProjectStoreApi();
  const renderRevision = useSavedProject((state) => state.renderRevision);
  const sequenceOrder = useSavedProject((state) => state.sequenceOrder);
  const projectSettings = useSavedProject((state) => state.project);
  const itemsById = useSavedProject((state) => state.itemsById);
  const timeline = useSavedProject((state) => state.timeline);
  const { schedules } = useSchedulesQuery();
  const previewProject = useMemo(
    () => reconstructSavedProject(savedStore.getState()),
    [itemsById, projectSettings, renderRevision, savedStore, sequenceOrder],
  );
  const durationInFrames = useMemo(
    () => getTimelineDurationInFrames(timeline, VIDEO_FPS),
    [timeline],
  );

  return {
    durationInFrames,
    previewProject,
    projectPath: hasData ? projectPath : null,
    timeline,
    schedules,
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
  durationInFrames: number;
  project: SavedProject;
  projectPath: string;
  timeline: SavedTimeline;
  schedules: SavedSchedules;
};

import { useEffect, useMemo } from "react";
import type { SavedProject } from "@/_schemas";
import { VIDEO_FPS } from "@/constants";
import { getProjectPageTimings } from "@/app/components/app-editor/editor-card/page-list/page-list.lib";
import { getPreviewPageStartFrame } from "@/app/components/app-editor/preview-card/preview-card.lib";
import { useRemotionPlayerControl } from "@/app/features/remotion/context/remotion-player-control-context";
import { useSelectedPageId } from "@/app/features/project/context/project-route-context";

type UsePagePreviewSeekParams = {
  durationInFrames: number;
  project: SavedProject;
};

export function usePagePreviewSeek({ durationInFrames, project }: UsePagePreviewSeekParams) {
  const selectedPageId = useSelectedPageId();
  const playerControl = useRemotionPlayerControl();
  const pageTimings = useMemo(() => getProjectPageTimings(project), [project]);

  useEffect(() => {
    if (!selectedPageId) {
      return;
    }

    const timing = pageTimings.find((page) => page.id === selectedPageId);
    const targetFrame = getPreviewPageStartFrame(timing?.startSec, VIDEO_FPS, durationInFrames);
    playerControl.pause();
    playerControl.seekTo(targetFrame);
  }, [durationInFrames, pageTimings, playerControl, selectedPageId]);
}

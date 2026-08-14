import { useEffect, useMemo } from "react";
import type { SavedProject } from "@/_schemas";
import { VIDEO_FPS } from "@/constants";
import { getProjectPageTimings } from "@/app/components/app-editor/editor-card/page-list/page-list.lib";
import { getPreviewPageStartFrame } from "@/app/components/app-editor/preview-card/preview-card.lib";
import { useRemotionPlayerControl } from "@/app/features/remotion/context/remotion-player-control-context";
import { usePage } from "@/app/features/page";

type UsePagePreviewSeekParams = {
  durationInFrames: number;
  project: SavedProject;
};

export function usePagePreviewSeek({ durationInFrames, project }: UsePagePreviewSeekParams) {
  const { selectedPageIndex } = usePage();
  const playerControl = useRemotionPlayerControl();
  const pageTimings = useMemo(() => getProjectPageTimings(project), [project]);

  useEffect(() => {
    if (selectedPageIndex === null) {
      return;
    }

    const targetFrame = getPreviewPageStartFrame(
      pageTimings[selectedPageIndex]?.startSec,
      VIDEO_FPS,
      durationInFrames,
    );

    playerControl.pause();
    playerControl.seekTo(targetFrame);
  }, [durationInFrames, pageTimings, playerControl, selectedPageIndex]);
}

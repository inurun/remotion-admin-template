import { useEffect, useMemo, useRef } from "react";
import type { SavedTimeline } from "@/_schemas";
import { VIDEO_FPS } from "@/constants";
import { getProjectPageTimings } from "@/app/components/app-editor/editor-card/page-list/page-list.lib";
import {
  getPageIdToSeek,
  getPreviewPageStartFrame,
} from "@/app/components/app-editor/preview-card/preview-card.lib";
import { useRemotionPlayerControl } from "@/app/features/remotion/context/remotion-player-control-context";
import { useSelectedPageId } from "@/app/features/project/context/project-route-context";

type UsePagePreviewSeekParams = {
  durationInFrames: number;
  timeline: SavedTimeline;
};

export function usePagePreviewSeek({ durationInFrames, timeline }: UsePagePreviewSeekParams) {
  const selectedPageId = useSelectedPageId();
  const playerControl = useRemotionPlayerControl();
  const pageTimings = useMemo(() => getProjectPageTimings(timeline), [timeline]);
  const previousPageIdRef = useRef<string | null>(null);

  useEffect(() => {
    const pageIdToSeek = getPageIdToSeek(previousPageIdRef.current, selectedPageId);
    previousPageIdRef.current = selectedPageId;
    if (!pageIdToSeek) {
      return;
    }

    const timing = pageTimings.find((page) => page.id === pageIdToSeek);
    const targetFrame = getPreviewPageStartFrame(timing?.startSec, VIDEO_FPS, durationInFrames);
    playerControl.pause();
    playerControl.seekTo(targetFrame);
  }, [durationInFrames, pageTimings, playerControl, selectedPageId]);
}

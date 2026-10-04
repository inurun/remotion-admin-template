import "@hyperframes/player";
import type { HyperframesPlayer } from "@hyperframes/player";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SavedProject, SavedSchedules, SavedTimeline } from "@/_schemas";
import { HF_DATA_CHANNEL, getHfPreviewHref } from "@/video-host/constants";
import { useVideoPlayerControl } from "@/app/features/video-player/context/video-player-control-context";
import { buildVideoInputProps } from "@/app/features/video-player/lib/composition-input";

type UsePreviewPlayerParams = {
  durationInFrames: number;
  project: SavedProject;
  projectPath: string;
  timeline: SavedTimeline;
  schedules: SavedSchedules;
};

export function usePreviewPlayer({
  durationInFrames,
  project,
  projectPath,
  timeline,
  schedules,
}: UsePreviewPlayerParams) {
  const { setPlayerRef } = useVideoPlayerControl();
  const [player, setPlayer] = useState<HyperframesPlayer | null>(null);
  const { width, height } = project.meta;
  const src = getHfPreviewHref(projectPath, { durationInFrames, width, height });
  const data = useMemo(
    () => buildVideoInputProps({ project, timeline, schedules }),
    [project, timeline, schedules],
  );

  const playerRef = useCallback(
    (element: HyperframesPlayer | null) => {
      setPlayer(element);
      setPlayerRef(element);
    },
    [setPlayerRef],
  );

  // Edited data goes over runtime data; the player retains it across reloads.
  useEffect(() => {
    if (!player) {
      return;
    }
    player.setRuntimeData(HF_DATA_CHANNEL, data);
  }, [data, player]);

  useEffect(() => {
    if (!player) {
      return;
    }
    const onError = (event: Event) => {
      console.error("[preview] runtime data not applied", (event as CustomEvent).detail);
    };
    player.addEventListener("runtimedataerror", onError);
    return () => player.removeEventListener("runtimedataerror", onError);
  }, [player]);

  return {
    aspectRatio: `${width} / ${height}`,
    playerRef,
    src,
  };
}

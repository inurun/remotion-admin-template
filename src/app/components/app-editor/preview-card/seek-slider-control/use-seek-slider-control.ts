import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { VIDEO_FPS } from "@/constants";
import { useRemotionPlayerControl } from "@/app/features/remotion/context/remotion-player-control-context";
import {
  clampFrame,
  formatFrameTime,
} from "@/app/components/app-editor/preview-card/preview-card.lib";

type UseSeekSliderControlParams = {
  durationInFrames: number;
};

function getSliderNumber(value: number | readonly number[]) {
  return typeof value === "number" ? value : (value[0] ?? 0);
}

export function useSeekSliderControl({ durationInFrames }: UseSeekSliderControlParams) {
  const playerControl = useRemotionPlayerControl();
  const [dragFrame, setDragFrame] = useState<number | null>(null);
  const wasPlayingBeforeSeekRef = useRef(false);
  const isSeekingRef = useRef(false);
  const maxFrame = Math.max(0, durationInFrames - 1);
  const sliderMaxFrame = Math.max(1, maxFrame);

  const currentFrame = useSyncExternalStore(
    useCallback(
      (onStoreChange) => {
        const handleFrameChange = () => onStoreChange();

        playerControl.addEventListener("frameupdate", handleFrameChange);
        playerControl.addEventListener("seeked", handleFrameChange);

        return () => {
          playerControl.removeEventListener("frameupdate", handleFrameChange);
          playerControl.removeEventListener("seeked", handleFrameChange);
        };
      },
      [playerControl],
    ),
    () => clampFrame(playerControl.getCurrentFrame(), durationInFrames),
    () => 0,
  );
  const visibleFrame = dragFrame ?? currentFrame;

  const seek = useCallback(
    (value: number | readonly number[]) => {
      const nextFrame = clampFrame(getSliderNumber(value), durationInFrames);

      if (!isSeekingRef.current) {
        wasPlayingBeforeSeekRef.current = playerControl.isPlaying();
        isSeekingRef.current = true;

        if (wasPlayingBeforeSeekRef.current) {
          playerControl.pause();
        }
      }

      setDragFrame(nextFrame);
      playerControl.seekTo(nextFrame);
    },
    [durationInFrames, playerControl],
  );

  const commitSeek = useCallback(
    (value: number | readonly number[]) => {
      const nextFrame = clampFrame(getSliderNumber(value), durationInFrames);

      playerControl.seekTo(nextFrame);
      setDragFrame(null);
      isSeekingRef.current = false;

      if (wasPlayingBeforeSeekRef.current && nextFrame < maxFrame) {
        playerControl.play();
      }

      wasPlayingBeforeSeekRef.current = false;
    },
    [durationInFrames, maxFrame, playerControl],
  );

  return {
    commitSeek,
    currentTimeLabel: formatFrameTime(visibleFrame, VIDEO_FPS),
    durationTimeLabel: formatFrameTime(maxFrame, VIDEO_FPS),
    maxFrame,
    seek,
    sliderMaxFrame,
    visibleFrame,
  };
}

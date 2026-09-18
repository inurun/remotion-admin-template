import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { useRemotionPlayerControl } from "@/app/features/remotion/context/remotion-player-control-context";
import { clampFrame } from "@/app/components/app-editor/preview-card/preview-card.lib";
import { stepFrame, xToFrame } from "@/app/components/app-editor/timeline-view/timeline-view.lib";

type UseTimelinePlayheadParams = {
  contentWidth: number;
  durationInFrames: number;
};

export function useTimelinePlayhead({ contentWidth, durationInFrames }: UseTimelinePlayheadParams) {
  const playerControl = useRemotionPlayerControl();
  const [dragFrame, setDragFrame] = useState<number | null>(null);
  const wasPlayingBeforeSeekRef = useRef(false);
  const isSeekingRef = useRef(false);
  const maxFrame = Math.max(0, durationInFrames - 1);

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

  const seekToX = useCallback(
    (x: number) => {
      const nextFrame = xToFrame(x, contentWidth, durationInFrames);
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
    [contentWidth, durationInFrames, playerControl],
  );

  const commitSeek = useCallback(() => {
    const nextFrame = dragFrame ?? clampFrame(playerControl.getCurrentFrame(), durationInFrames);
    playerControl.seekTo(nextFrame);
    setDragFrame(null);
    isSeekingRef.current = false;
    if (wasPlayingBeforeSeekRef.current && nextFrame < maxFrame) {
      playerControl.play();
    }
    wasPlayingBeforeSeekRef.current = false;
  }, [dragFrame, durationInFrames, maxFrame, playerControl]);

  const nudgeFrame = useCallback(
    (delta: number) => {
      if (isSeekingRef.current) {
        return;
      }
      if (playerControl.isPlaying()) {
        playerControl.pause();
      }
      playerControl.seekTo(stepFrame(playerControl.getCurrentFrame(), delta, durationInFrames));
    },
    [durationInFrames, playerControl],
  );

  return {
    commitSeek,
    nudgeFrame,
    seekToX,
    visibleFrame,
  };
}

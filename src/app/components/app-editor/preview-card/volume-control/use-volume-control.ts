import { useCallback, useEffect, useState } from "react";
import { useVideoPlayerControl } from "@/app/features/video-player/context/video-player-control-context";
import { PREVIEW_INITIAL_VOLUME } from "@/app/components/app-editor/preview-card/preview-player/preview-player";

function clampVolume(volume: number) {
  return Math.min(Math.max(volume, 0), 1);
}

export function useVolumeControl() {
  const playerControl = useVideoPlayerControl();
  const [volume, setVolumeState] = useState(PREVIEW_INITIAL_VOLUME);

  const setVolume = useCallback(
    (nextVolume: number) => {
      const normalizedVolume = clampVolume(nextVolume);

      playerControl.setVolume(normalizedVolume);
      setVolumeState(normalizedVolume);
    },
    [playerControl],
  );

  useEffect(() => {
    const handleVolumeChange = ({ detail }: { detail: { volume: number } }) => {
      setVolumeState(detail.volume);
    };

    playerControl.addEventListener("volumechange", handleVolumeChange);

    return () => {
      playerControl.removeEventListener("volumechange", handleVolumeChange);
    };
  }, [playerControl]);

  return {
    setVolume,
    volume,
  };
}

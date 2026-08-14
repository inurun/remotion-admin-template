import { useEffect, useState } from "react";
import { useRemotionPlayerControl } from "@/app/features/remotion/context/remotion-player-control-context";

export function usePlaybackControl() {
  const playerControl = useRemotionPlayerControl();
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    playerControl.addEventListener("play", handlePlay);
    playerControl.addEventListener("pause", handlePause);
    playerControl.addEventListener("ended", handleEnded);

    return () => {
      playerControl.removeEventListener("play", handlePlay);
      playerControl.removeEventListener("pause", handlePause);
      playerControl.removeEventListener("ended", handleEnded);
    };
  }, [playerControl]);

  return {
    isPlaying,
    toggle: playerControl.toggle,
  };
}

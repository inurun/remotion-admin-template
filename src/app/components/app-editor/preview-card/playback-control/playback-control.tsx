import { Pause, Play } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";
import { usePlaybackControl } from "./use-playback-control";

export function PlaybackControl() {
  const { isPlaying, toggle } = usePlaybackControl();

  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      onClick={toggle}
      title={isPlaying ? "Pause" : "Play"}
      aria-label={isPlaying ? "Pause" : "Play"}
    >
      {isPlaying ? <Pause /> : <Play />}
    </Button>
  );
}

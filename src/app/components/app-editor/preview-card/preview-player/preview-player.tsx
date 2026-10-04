import { memo } from "react";
import type { SavedProject, SavedSchedules, SavedTimeline } from "@/_schemas";
import type { PreviewPlaybackRate } from "@/app/components/app-editor/preview-card/preview-card.lib";
import { usePreviewPlayer } from "@/app/components/app-editor/preview-card/preview-player/use-preview-player";

type PreviewPlayerProps = {
  durationInFrames: number;
  playbackRate: PreviewPlaybackRate;
  project: SavedProject;
  projectPath: string;
  timeline: SavedTimeline;
  schedules: SavedSchedules;
};

export const PREVIEW_INITIAL_VOLUME = 1;

export const PreviewPlayer = memo(function PreviewPlayer({
  playbackRate,
  ...props
}: PreviewPlayerProps) {
  const { aspectRatio, playerRef, src } = usePreviewPlayer(props);

  return (
    <div className="overflow-hidden bg-muted/40" style={{ aspectRatio }}>
      <hyperframes-player
        ref={playerRef}
        src={src}
        playback-rate={String(playbackRate)}
        disable-click-to-play=""
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
});

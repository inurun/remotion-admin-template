import { Player } from "@remotion/player";
import { memo, useMemo } from "react";
import type { ComponentType } from "react";
import type { SavedProject } from "@/_schemas";
import { VIDEO_FPS } from "@/constants";
import { useRemotionPlayerControl } from "@/app/features/remotion/context/remotion-player-control-context";
import type { PreviewPlaybackRate } from "@/app/components/app-editor/preview-card/preview-card.lib";

type PreviewPlayerProps = {
  component: ComponentType<{ project: SavedProject }>;
  durationInFrames: number;
  playbackRate: PreviewPlaybackRate;
  project: SavedProject;
};

export const PREVIEW_INITIAL_VOLUME = 1;

export const PreviewPlayer = memo(function PreviewPlayer({
  component,
  durationInFrames,
  playbackRate,
  project,
}: PreviewPlayerProps) {
  const { setPlayerRef } = useRemotionPlayerControl();
  const inputProps = useMemo(() => ({ project }), [project]);
  const aspectRatio = `${project.meta.width} / ${project.meta.height}`;

  return (
    <div className="remotion-surface overflow-hidden bg-muted/40" style={{ aspectRatio }}>
      <Player
        ref={setPlayerRef}
        acknowledgeRemotionLicense
        component={component}
        inputProps={inputProps}
        durationInFrames={durationInFrames}
        fps={VIDEO_FPS}
        compositionWidth={project.meta.width}
        compositionHeight={project.meta.height}
        style={{ width: "100%" }}
        controls={false}
        loop={false}
        autoPlay={false}
        initialVolume={PREVIEW_INITIAL_VOLUME}
        playbackRate={playbackRate}
      />
    </div>
  );
});

import { useMemo } from "react";
import { Html5Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { BgmTrack } from "@/_schemas";
import { assetPath, type AssetFile } from "@/_shared/lib/assets/path";
import { secondsToFrames } from "@/remotion/utils/timing";
import { collectDuckableIntervals } from "@/remotion/utils/ducking/collect-duckable-intervals";
import { computeDuckFactor } from "@/remotion/utils/ducking/compute-duck-factor";
import { computeFadeFactor } from "@/remotion/utils/ducking/compute-fade-factor";
import { useProject } from "@/remotion/core/context";

const FADE_SEC = 1.5;
const DUCK_DOWN_SEC = 0.5;
const DUCK_HOLD_SEC = 0.5;
const DUCK_RELEASE_SEC = 1.0;

function getBgmAssetPath(src: string) {
  return assetPath(`bgm/${src}` as AssetFile);
}

function BgmTrack({
  track,
  globalFrame,
  duckFactor,
  totalFrames,
  fps,
}: {
  track: BgmTrack;
  globalFrame: number;
  duckFactor: number;
  totalFrames: number;
  fps: number;
}) {
  const startFrame = track.startSec !== null ? secondsToFrames(track.startSec, fps) : 0;
  const endFrame = track.endSec !== null ? secondsToFrames(track.endSec, fps) : totalFrames;
  const durationFrames = Math.max(1, endFrame - startFrame);
  const isLoop = track.endSec === null;
  const fadeFrames = Math.round(FADE_SEC * fps);
  const localFrame = globalFrame - startFrame;

  const volume = useMemo(() => {
    const fadeFactor = computeFadeFactor(
      localFrame,
      durationFrames,
      track.fadeIn,
      track.fadeOut,
      fadeFrames,
    );
    return track.volume * duckFactor * fadeFactor;
  }, [
    localFrame,
    durationFrames,
    track.fadeIn,
    track.fadeOut,
    track.volume,
    fadeFrames,
    duckFactor,
  ]);

  return (
    <Sequence
      from={startFrame}
      durationInFrames={isLoop ? Infinity : durationFrames}
      layout="none"
      showInTimeline={false}
    >
      <Html5Audio
        src={staticFile(getBgmAssetPath(track.src))}
        volume={volume}
        loop={isLoop}
        name={`bgm-${track.src}`}
      />
    </Sequence>
  );
}

export function BgmLayer() {
  const project = useProject();
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const holdFrames = Math.round(DUCK_HOLD_SEC * fps);
  const fadeDownFrames = Math.round(DUCK_DOWN_SEC * fps);
  const fadeUpFrames = Math.round(DUCK_RELEASE_SEC * fps);

  const duckableIntervals = useMemo(() => collectDuckableIntervals(project, fps), [project, fps]);

  const duckFactor = useMemo(
    () => computeDuckFactor(frame, duckableIntervals, holdFrames, fadeDownFrames, fadeUpFrames),
    [frame, duckableIntervals, holdFrames, fadeDownFrames, fadeUpFrames],
  );

  if (project.bgm.length === 0) {
    return null;
  }

  return project.bgm.map((track, index) => (
    <BgmTrack
      key={index}
      track={track}
      globalFrame={frame}
      duckFactor={duckFactor}
      totalFrames={durationInFrames}
      fps={fps}
    />
  ));
}

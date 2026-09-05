import { useMemo } from "react";
import { Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import type { BgmTrack } from "@/_schemas";
import { assetPath, type AssetFile } from "@/_shared/lib/assets/path";
import { secondsToFrames } from "@/remotion/utils/timing";
import { collectDuckableIntervals } from "@/remotion/utils/ducking/collect-duckable-intervals";
import { computeDuckAmount } from "@/remotion/utils/ducking/compute-duck-amount";
import { computeFadeFactor } from "@/remotion/utils/ducking/compute-fade-factor";
import { useProject } from "@/remotion/core/context";
import { BGM_DUCK, BGM_FADE_SEC } from "./layer-bgm.constants";

function getBgmAssetPath(src: string) {
  return assetPath(`bgm/${src}` as AssetFile);
}

function BgmTrack({
  track,
  globalFrame,
  duckAmount,
  totalFrames,
  fps,
}: {
  track: BgmTrack;
  globalFrame: number;
  duckAmount: number;
  totalFrames: number;
  fps: number;
}) {
  const startFrame = track.startSec !== null ? secondsToFrames(track.startSec, fps) : 0;
  const endFrame = track.endSec !== null ? secondsToFrames(track.endSec, fps) : totalFrames;
  const durationFrames = Math.max(1, endFrame - startFrame);
  const isLoop = track.endSec === null;
  const fadeFrames = Math.round(BGM_FADE_SEC * fps);
  const localFrame = globalFrame - startFrame;

  const volume = useMemo(() => {
    const fadeFactor = computeFadeFactor(
      localFrame,
      durationFrames,
      track.fadeIn,
      track.fadeOut,
      fadeFrames,
    );
    return Math.max(0, track.volume - duckAmount) * fadeFactor;
  }, [
    localFrame,
    durationFrames,
    track.fadeIn,
    track.fadeOut,
    track.volume,
    fadeFrames,
    duckAmount,
  ]);

  return (
    <Sequence
      from={startFrame}
      durationInFrames={isLoop ? Infinity : durationFrames}
      layout="none"
      showInTimeline={false}
    >
      <Audio
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
  const holdFrames = Math.round(BGM_DUCK.holdSec * fps);
  const fadeDownFrames = Math.round(BGM_DUCK.downSec * fps);
  const fadeUpFrames = Math.round(BGM_DUCK.releaseSec * fps);

  const duckableIntervals = useMemo(() => collectDuckableIntervals(project, fps), [project, fps]);

  const duckAmount = useMemo(
    () =>
      computeDuckAmount(
        frame,
        duckableIntervals,
        holdFrames,
        fadeDownFrames,
        fadeUpFrames,
        BGM_DUCK.drop,
      ),
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
      duckAmount={duckAmount}
      totalFrames={durationInFrames}
      fps={fps}
    />
  ));
}

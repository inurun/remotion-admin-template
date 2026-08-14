import { RemotionPlayerControlProvider } from "@/app/features/remotion/context/remotion-player-control-context";
import { PlaybackControl } from "@/app/components/app-editor/preview-card/playback-control/playback-control";
import { PlaybackRateControl } from "@/app/components/app-editor/preview-card/playback-rate-control/playback-rate-control";
import { PreviewPlayer } from "@/app/components/app-editor/preview-card/preview-player/preview-player";
import { SeekSliderControl } from "@/app/components/app-editor/preview-card/seek-slider-control/seek-slider-control";
import {
  type PreviewPlayerAreaProps,
  usePreviewPlayerArea,
} from "@/app/components/app-editor/preview-card/use-preview-card";
import { usePagePreviewSeek } from "@/app/components/app-editor/preview-card/use-page-preview-seek";
import { VolumeControl } from "@/app/components/app-editor/preview-card/volume-control/volume-control";

function PreviewPlayerArea({ component, durationInFrames, project }: PreviewPlayerAreaProps) {
  const { playbackRate, setPlaybackRate } = usePreviewPlayerArea();
  usePagePreviewSeek({ durationInFrames, project });

  return (
    <>
      <PreviewPlayer
        component={component}
        durationInFrames={durationInFrames}
        playbackRate={playbackRate}
        project={project}
      />
      <div className="grid gap-3 pt-3">
        <div className="flex items-center gap-3">
          <PlaybackControl />
          <SeekSliderControl durationInFrames={durationInFrames} />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <VolumeControl />
          <PlaybackRateControl playbackRate={playbackRate} setPlaybackRate={setPlaybackRate} />
        </div>
      </div>
    </>
  );
}

export function PreviewBody(props: PreviewPlayerAreaProps) {
  return (
    <RemotionPlayerControlProvider>
      <PreviewPlayerArea {...props} />
    </RemotionPlayerControlProvider>
  );
}

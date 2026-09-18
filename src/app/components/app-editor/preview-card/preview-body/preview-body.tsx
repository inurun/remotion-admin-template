import { PlaybackControl } from "@/app/components/app-editor/preview-card/playback-control/playback-control";
import { PreviewPlayer } from "@/app/components/app-editor/preview-card/preview-player/preview-player";
import { SeekSliderControl } from "@/app/components/app-editor/preview-card/seek-slider-control/seek-slider-control";
import {
  type PreviewPlayerAreaProps,
  usePreviewPlayerArea,
} from "@/app/components/app-editor/preview-card/use-preview-card";

function PreviewPlayerArea({
  component,
  durationInFrames,
  project,
  timeline,
  schedules,
}: PreviewPlayerAreaProps) {
  const { playbackRate } = usePreviewPlayerArea();

  return (
    <>
      <PreviewPlayer
        component={component}
        durationInFrames={durationInFrames}
        playbackRate={playbackRate}
        project={project}
        timeline={timeline}
        schedules={schedules}
      />
      <div className="grid gap-3 pt-3">
        <div className="flex items-center gap-3">
          <PlaybackControl />
          <SeekSliderControl durationInFrames={durationInFrames} />
        </div>
      </div>
    </>
  );
}

export function PreviewBody(props: PreviewPlayerAreaProps) {
  return <PreviewPlayerArea {...props} />;
}

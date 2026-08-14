import { Slider } from "@/_shared/components/ui/slider";
import { useSeekSliderControl } from "./use-seek-slider-control";

type SeekSliderControlProps = {
  durationInFrames: number;
};

export function SeekSliderControl({ durationInFrames }: SeekSliderControlProps) {
  const {
    commitSeek,
    currentTimeLabel,
    durationTimeLabel,
    maxFrame,
    seek,
    sliderMaxFrame,
    visibleFrame,
  } = useSeekSliderControl({ durationInFrames });

  return (
    <>
      <Slider
        value={visibleFrame}
        min={0}
        max={sliderMaxFrame}
        step={1}
        disabled={maxFrame === 0}
        onValueChange={seek}
        onValueCommitted={commitSeek}
        className="min-w-0 flex-1"
      />
      <span className="w-22 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {currentTimeLabel} / {durationTimeLabel}
      </span>
    </>
  );
}

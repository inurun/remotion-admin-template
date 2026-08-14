import { Volume1, Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/_shared/components/ui/slider";
import { useVolumeControl } from "./use-volume-control";

function VolumeIcon({ volume }: { volume: number }) {
  if (volume === 0) {
    return <VolumeX />;
  }

  if (volume < 0.5) {
    return <Volume1 />;
  }

  return <Volume2 />;
}

function getSliderNumber(value: number | readonly number[]) {
  return typeof value === "number" ? value : (value[0] ?? 0);
}

export function VolumeControl() {
  const { setVolume, volume } = useVolumeControl();

  return (
    <div className="flex min-w-32 items-center gap-2">
      <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">
        <VolumeIcon volume={volume} />
      </span>
      <Slider
        value={volume}
        min={0}
        max={1}
        step={0.01}
        onValueChange={(value) => setVolume(getSliderNumber(value))}
        className="w-24"
      />
    </div>
  );
}

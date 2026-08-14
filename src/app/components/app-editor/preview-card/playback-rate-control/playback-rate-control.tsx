import { Button } from "@/_shared/components/ui/button";
import { cn } from "@/_shared/lib/utils";
import {
  PREVIEW_PLAYBACK_RATES,
  type PreviewPlaybackRate,
} from "@/app/components/app-editor/preview-card/preview-card.lib";

type PlaybackRateControlProps = {
  playbackRate: PreviewPlaybackRate;
  setPlaybackRate: (playbackRate: PreviewPlaybackRate) => void;
};

export function PlaybackRateControl({ playbackRate, setPlaybackRate }: PlaybackRateControlProps) {
  return (
    <div className="flex items-center gap-1">
      {PREVIEW_PLAYBACK_RATES.map((rate) => (
        <Button
          key={rate}
          type="button"
          size="xs"
          variant={playbackRate === rate ? "secondary" : "outline"}
          onClick={() => setPlaybackRate(rate)}
          title={`${rate}x`}
          aria-label={`${rate}x`}
          className={cn("w-12", playbackRate === rate && "border-primary/20")}
        >
          {rate}x
        </Button>
      ))}
    </div>
  );
}

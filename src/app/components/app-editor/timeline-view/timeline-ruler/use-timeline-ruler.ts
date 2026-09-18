import { useMemo } from "react";
import { formatFrameTime } from "@/app/components/app-editor/preview-card/preview-card.lib";
import { VIDEO_FPS } from "@/constants";
import type { getRulerTicks } from "@/app/components/app-editor/timeline-view/timeline-view.lib";

type UseTimelineRulerParams = {
  ticks: ReturnType<typeof getRulerTicks>;
};

export function useTimelineRuler({ ticks }: UseTimelineRulerParams) {
  const labels = useMemo(
    () =>
      ticks.map((tick) => ({
        ...tick,
        label: formatFrameTime(Math.round(tick.sec * VIDEO_FPS), VIDEO_FPS).slice(0, 5),
      })),
    [ticks],
  );

  return { labels };
}

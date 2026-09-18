import { useTimelineTracks } from "@/app/components/app-editor/timeline-view/timeline-tracks/use-timeline-tracks";
import type { TimelineLane } from "@/app/components/app-editor/timeline-view/timeline-view.lib";

type TimelineTracksProps = {
  contentWidth: number;
  labelWidth: number;
  lanes: TimelineLane[];
  pixelsPerSecond: number;
};

export function TimelineTracks({
  contentWidth,
  labelWidth,
  lanes,
  pixelsPerSecond,
}: TimelineTracksProps) {
  const { laneHeight, lanes: resolvedLanes } = useTimelineTracks({ lanes, pixelsPerSecond });

  return (
    <div>
      {resolvedLanes.map((lane) => (
        <div key={lane.id} className="flex border-b border-border/60">
          <div
            className="sticky left-0 z-10 flex shrink-0 items-center border-r border-border bg-card px-2 text-[10px] text-muted-foreground"
            style={{ width: labelWidth, height: laneHeight }}
          >
            {lane.label}
          </div>
          <div className="relative" style={{ width: contentWidth, height: laneHeight }}>
            {lane.clips.map((clip) => (
              <div
                key={clip.id}
                title={clip.label}
                className={`absolute top-[3px] overflow-hidden rounded-sm px-1 text-[10px] leading-5 text-white ${clip.barClassName}`}
                style={clip.barStyle}
              >
                <span className="block truncate">{clip.label}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

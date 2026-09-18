import type { PointerEventHandler, Ref } from "react";
import { useTimelineRuler } from "@/app/components/app-editor/timeline-view/timeline-ruler/use-timeline-ruler";
import type { getRulerTicks } from "@/app/components/app-editor/timeline-view/timeline-view.lib";

type TimelineRulerProps = {
  contentWidth: number;
  labelWidth: number;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
  ticks: ReturnType<typeof getRulerTicks>;
  timeAreaRef: Ref<HTMLDivElement>;
};

export function TimelineRuler({
  contentWidth,
  labelWidth,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  ticks,
  timeAreaRef,
}: TimelineRulerProps) {
  const { labels } = useTimelineRuler({ ticks });

  return (
    <div className="sticky top-0 z-20 flex border-b border-border bg-card">
      <div
        className="sticky left-0 z-10 shrink-0 border-r border-border bg-card"
        style={{ width: labelWidth }}
      />
      <div
        ref={timeAreaRef}
        className="relative h-6 cursor-ew-resize select-none"
        style={{ width: contentWidth }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {labels.map((tick) => (
          <span
            key={tick.sec}
            className="pointer-events-none absolute top-1 -translate-x-1/2 text-[10px] tabular-nums text-muted-foreground"
            style={{ left: tick.x }}
          >
            {tick.label}
          </span>
        ))}
      </div>
    </div>
  );
}

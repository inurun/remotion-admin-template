import { TimelineRuler } from "@/app/components/app-editor/timeline-view/timeline-ruler/timeline-ruler";
import { TimelineTracks } from "@/app/components/app-editor/timeline-view/timeline-tracks/timeline-tracks";
import { useTimelineView } from "@/app/components/app-editor/timeline-view/use-timeline-view";

export function TimelineView() {
  const {
    contentWidth,
    lanes,
    labelWidth,
    onBlur,
    onFocus,
    onPointerDown,
    onPointerDownCapture,
    onPointerMove,
    onPointerUp,
    pixelsPerSecond,
    playheadX,
    rootRef,
    scrollRef,
    ticks,
    timeAreaRef,
  } = useTimelineView();

  return (
    <section
      ref={rootRef}
      tabIndex={0}
      onFocus={onFocus}
      onBlur={onBlur}
      onPointerDownCapture={onPointerDownCapture}
      className="flex h-full min-h-0 select-none flex-col overflow-hidden rounded-xl bg-card text-sm ring-1 ring-foreground/10 outline-none focus-visible:ring-ring"
    >
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto scrollbar-none">
        <div className="relative min-w-full" style={{ width: labelWidth + contentWidth }}>
          <TimelineRuler
            contentWidth={contentWidth}
            labelWidth={labelWidth}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            ticks={ticks}
            timeAreaRef={timeAreaRef}
          />
          <TimelineTracks
            contentWidth={contentWidth}
            labelWidth={labelWidth}
            lanes={lanes}
            pixelsPerSecond={pixelsPerSecond}
          />
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-30"
            style={{ left: labelWidth + playheadX }}
          >
            <div className="h-full w-px bg-red-500" />
            <div
              className="pointer-events-auto absolute top-0 left-1/2 size-3 -translate-x-1/2 cursor-ew-resize rounded-sm bg-red-500"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { VIDEO_FPS } from "@/constants";
import { useSavedProject } from "@/app/features/editor/store/saved-project-store-context";
import { useTimelineViewHotkeys } from "@/app/components/app-editor/timeline-view/timeline-view.hotkeys";
import { useTimelinePlayhead } from "@/app/components/app-editor/timeline-view/use-timeline-playhead";
import {
  TIMELINE_TRACK_LABEL_WIDTH_PX,
  buildTimelineLanes,
  frameToX,
  getRulerTicks,
  getTimelineContentWidth,
  getTimelinePixelsPerSecond,
} from "@/app/components/app-editor/timeline-view/timeline-view.lib";

export function useTimelineView() {
  const timeline = useSavedProject((state) => state.timeline);
  const itemsById = useSavedProject((state) => state.itemsById);
  const rootRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeAreaRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }
    const update = () => setViewportWidth(node.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const lanes = useMemo(() => buildTimelineLanes(timeline, itemsById), [itemsById, timeline]);
  const durationInFrames = useMemo(
    () => Math.max(1, Math.ceil(timeline.durationSec * VIDEO_FPS)),
    [timeline],
  );
  const pixelsPerSecond = getTimelinePixelsPerSecond(
    timeline.durationSec,
    Math.max(0, viewportWidth - TIMELINE_TRACK_LABEL_WIDTH_PX),
  );
  const contentWidth = getTimelineContentWidth(timeline.durationSec, pixelsPerSecond);
  const ticks = useMemo(
    () => getRulerTicks(timeline.durationSec, pixelsPerSecond),
    [pixelsPerSecond, timeline.durationSec],
  );
  const { commitSeek, nudgeFrame, seekToX, visibleFrame } = useTimelinePlayhead({
    contentWidth,
    durationInFrames,
  });
  useTimelineViewHotkeys({ enabled: focused, onNudge: nudgeFrame });
  const playheadX = frameToX(visibleFrame, contentWidth, durationInFrames);

  const pointerToX = useCallback((clientX: number) => {
    const node = timeAreaRef.current;
    if (!node) {
      return 0;
    }
    return clientX - node.getBoundingClientRect().left;
  }, []);

  const onPointerDownCapture = useCallback(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      seekToX(pointerToX(event.clientX));
    },
    [pointerToX, seekToX],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        return;
      }
      seekToX(pointerToX(event.clientX));
    },
    [pointerToX, seekToX],
  );

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      commitSeek();
    },
    [commitSeek],
  );

  return {
    contentWidth,
    lanes,
    labelWidth: TIMELINE_TRACK_LABEL_WIDTH_PX,
    onBlur: () => setFocused(false),
    onFocus: () => setFocused(true),
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
  };
}

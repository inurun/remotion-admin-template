import type { PageType, SavedSequenceItem, SavedTimeline, SavedTimelineClip } from "@/_schemas";
import { PAGE_TYPE_THUMBNAIL_GRADIENT } from "@/app/components/app-editor/editor-card/page-list/page-list.lib";
import { clampFrame } from "@/app/components/app-editor/preview-card/preview-card.lib";

export const TIMELINE_TRACK_LABEL_WIDTH_PX = 88;
export const TIMELINE_MIN_PIXELS_PER_SECOND = 24;
export const TIMELINE_LANE_HEIGHT_PX = 28;

export type TimelineLaneClipKind = "page" | "transition" | "nested";

export type TimelineLaneClip = {
  id: string;
  startSec: number;
  durationSec: number;
  label: string;
  kind: TimelineLaneClipKind;
  pageType?: PageType;
};

export type TimelineLane = {
  id: string;
  label: string;
  clips: TimelineLaneClip[];
};

type ClipLabelRecord = {
  kind: TimelineLaneClipKind;
  label: string;
  pageType?: PageType;
};

type AbsoluteClip = SavedTimelineClip & { startSec: number };

export function flattenNestedClips(clips: SavedTimelineClip[], parentStartSec = 0): AbsoluteClip[] {
  return clips.flatMap((clip) => {
    const startSec = parentStartSec + clip.startSec;
    return clip.clips.flatMap((child) => {
      const childStartSec = startSec + child.startSec;
      return [{ ...child, startSec: childStartSec }, ...flattenNestedClips([child], startSec)];
    });
  });
}

export function packOverlappingClips(clips: TimelineLaneClip[]): TimelineLaneClip[][] {
  const sorted = [...clips].sort((left, right) => left.startSec - right.startSec);
  const rows: TimelineLaneClip[][] = [];
  const rowEnds: number[] = [];

  for (const clip of sorted) {
    const rowIndex = rowEnds.findIndex((endSec) => endSec <= clip.startSec);
    if (rowIndex === -1) {
      rows.push([clip]);
      rowEnds.push(clip.startSec + clip.durationSec);
      continue;
    }
    rows[rowIndex]?.push(clip);
    rowEnds[rowIndex] = clip.startSec + clip.durationSec;
  }

  return rows;
}

export function buildClipLabelIndex(
  itemsById: Record<string, SavedSequenceItem>,
): Map<string, ClipLabelRecord> {
  const index = new Map<string, ClipLabelRecord>();

  for (const item of Object.values(itemsById)) {
    if (item.type === "transition") {
      index.set(item.id, { kind: "transition", label: item.variant });
      continue;
    }

    const title = item.title.trim();
    index.set(item.id, {
      kind: "page",
      label: title === "" ? item.type : title,
      pageType: item.type,
    });

    for (const tts of item.tts) {
      const text = tts.text.trim();
      index.set(tts.id, { kind: "nested", label: text === "" ? tts.id : text });
    }

    if (item.type === "comments") {
      for (const group of item.commentGroups) {
        const displayText = group.displayText?.trim();
        index.set(group.id, {
          kind: "nested",
          label: displayText && displayText !== "" ? displayText : group.id,
        });
      }
    }
  }

  return index;
}

function toLaneClip(
  clip: { id: string; startSec: number; durationSec: number },
  labels: Map<string, ClipLabelRecord>,
): TimelineLaneClip {
  const record = labels.get(clip.id);
  return {
    id: clip.id,
    startSec: clip.startSec,
    durationSec: clip.durationSec,
    label: record?.label ?? clip.id,
    kind: record?.kind ?? "nested",
    pageType: record?.pageType,
  };
}

export function buildTimelineLanes(
  timeline: SavedTimeline,
  itemsById: Record<string, SavedSequenceItem>,
): TimelineLane[] {
  const labels = buildClipLabelIndex(itemsById);

  return timeline.tracks.flatMap((track) => {
    const rootLane: TimelineLane = {
      id: `${track.id}:root`,
      label: track.id,
      clips: track.clips.map((clip) => toLaneClip(clip, labels)),
    };
    const nestedRows = packOverlappingClips(
      flattenNestedClips(track.clips).map((clip) => toLaneClip(clip, labels)),
    );

    return [
      rootLane,
      ...nestedRows.map((clips, index) => ({
        id: `${track.id}:nested:${index}`,
        label: "",
        clips,
      })),
    ];
  });
}

export function getTimelinePixelsPerSecond(durationSec: number, viewportWidth: number) {
  const duration = Math.max(durationSec, 0.001);
  return Math.max(TIMELINE_MIN_PIXELS_PER_SECOND, viewportWidth / duration);
}

export function getTimelineContentWidth(durationSec: number, pixelsPerSecond: number) {
  return Math.max(durationSec, 0.001) * pixelsPerSecond;
}

export function frameToX(frame: number, contentWidth: number, durationInFrames: number) {
  const maxFrame = Math.max(0, durationInFrames - 1);
  if (maxFrame === 0 || contentWidth <= 0) {
    return 0;
  }
  return (clampFrame(frame, durationInFrames) / maxFrame) * contentWidth;
}

export function xToFrame(x: number, contentWidth: number, durationInFrames: number) {
  if (contentWidth <= 0) {
    return 0;
  }
  const ratio = Math.min(1, Math.max(0, x / contentWidth));
  return clampFrame(Math.round(ratio * Math.max(0, durationInFrames - 1)), durationInFrames);
}

export function stepFrame(frame: number, delta: number, durationInFrames: number) {
  return clampFrame(frame + delta, durationInFrames);
}

export function getRulerStepSec(pixelsPerSecond: number) {
  if (pixelsPerSecond >= 80) {
    return 0.5;
  }
  if (pixelsPerSecond >= 40) {
    return 1;
  }
  if (pixelsPerSecond >= 20) {
    return 2;
  }
  return 5;
}

export function getRulerTicks(durationSec: number, pixelsPerSecond: number) {
  const stepSec = getRulerStepSec(pixelsPerSecond);
  const ticks: { sec: number; x: number }[] = [];
  const endSec = Math.max(durationSec, 0);
  for (let sec = 0; sec <= endSec + 1e-9; sec += stepSec) {
    ticks.push({ sec, x: sec * pixelsPerSecond });
  }
  return ticks;
}

export function getClipBarStyle(clip: TimelineLaneClip, pixelsPerSecond: number) {
  return {
    left: clip.startSec * pixelsPerSecond,
    width: Math.max(2, clip.durationSec * pixelsPerSecond),
  };
}

export function getClipBarClassName(clip: TimelineLaneClip) {
  if (clip.kind === "transition") {
    return "bg-muted-foreground/40";
  }
  if (clip.kind === "nested") {
    return "bg-cyan-700/80";
  }
  return "bg-slate-600";
}

export function getClipBarBackground(clip: TimelineLaneClip) {
  if (clip.kind === "page" && clip.pageType) {
    return PAGE_TYPE_THUMBNAIL_GRADIENT[clip.pageType];
  }
  return undefined;
}

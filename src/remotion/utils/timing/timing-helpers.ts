export interface TimingSegment {
  start: number;
  duration: number;
}

export function createSegment(start: number, duration: number): TimingSegment {
  return { start, duration };
}

export function getSegmentEnd(segment: TimingSegment): number {
  return segment.start + segment.duration;
}

export function isInSegment(frame: number, segment: TimingSegment): boolean {
  return frame >= segment.start && frame < getSegmentEnd(segment);
}

export function getLocalFrame(frame: number, segment: TimingSegment): number {
  if (!isInSegment(frame, segment)) {
    return -1;
  }

  return frame - segment.start;
}

export function createSequentialSegments(
  durations: number[],
  startFrame: number = 0,
): TimingSegment[] {
  const segments: TimingSegment[] = [];
  let currentStart = startFrame;

  for (const duration of durations) {
    segments.push(createSegment(currentStart, duration));
    currentStart += duration;
  }

  return segments;
}

export function stagger(index: number, staggerDelay: number, startFrame: number = 0): number {
  return startFrame + index * staggerDelay;
}

export type TtsTimingInput = {
  durationSec: number;
  padBeforeSec?: number;
  padAfterSec?: number;
};

export type TtsTimingSegment = {
  startSec: number;
  durationSec: number;
  endSec: number;
};

function createTtsTimingSegment({
  cursor,
  item,
  minDurationSec,
}: {
  cursor: number;
  item: TtsTimingInput;
  minDurationSec: number;
}): TtsTimingSegment {
  const startSec = cursor + (item.padBeforeSec ?? 0);
  const durationSec = Math.max(minDurationSec, item.durationSec + (item.padAfterSec ?? 0));
  return {
    startSec,
    durationSec,
    endSec: startSec + durationSec,
  };
}

export function createTtsTimingSegments(
  items: readonly TtsTimingInput[],
  options: { startSec?: number; minDurationSec?: number } = {},
): TtsTimingSegment[] {
  const minDurationSec = options.minDurationSec ?? 0;
  const segments: TtsTimingSegment[] = [];
  let cursor = options.startSec ?? 0;

  for (const item of items) {
    const segment = createTtsTimingSegment({ cursor, item, minDurationSec });
    segments.push(segment);
    cursor = segment.endSec;
  }

  return segments;
}

export function getTtsTimingEndSec(segments: readonly TtsTimingSegment[]) {
  return segments.at(-1)?.endSec ?? 0;
}

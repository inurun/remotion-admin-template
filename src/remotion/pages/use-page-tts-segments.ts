import { createTtsTimingSegments } from "@/_shared/lib/tts/tts-timing";
import { isPlayableTts } from "@/_shared/lib/tts/tts-audio";
import { secondsToFrames } from "@/remotion/utils/timing";
import { staticFile, useVideoConfig } from "remotion";
import type { SavedTts } from "@/_schemas";

const MIN_TTS_DURATION_FRAMES = 1;

export function usePageTtsSegments(page: { padBeforeSec: number; tts: SavedTts[] }) {
  const { fps } = useVideoConfig();
  const readyItems = page.tts.filter(isPlayableTts);
  const segments = createTtsTimingSegments(
    readyItems.map((tts) => ({
      durationSec: tts.audio.durationSec,
      padBeforeSec: tts.padBeforeSec,
      padAfterSec: tts.padAfterSec,
    })),
    {
      minDurationSec: 1 / fps,
    },
  );

  const ttsSegments = segments.map((segment, index) => {
    const tts = readyItems[index]!;
    return {
      ...tts,
      start: secondsToFrames(page.padBeforeSec + segment.startSec, fps),
      duration: Math.max(MIN_TTS_DURATION_FRAMES, secondsToFrames(segment.durationSec, fps)),
      audio: {
        src: staticFile(tts.audio.src),
      },
    };
  });

  return { ttsSegments };
}

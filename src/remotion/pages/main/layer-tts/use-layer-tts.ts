import { createTtsTimingSegments } from "@/_shared/lib/tts/tts-timing";
import { secondsToFrames } from "@/remotion/utils/timing";
import { staticFile, useVideoConfig } from "remotion";
import { useMainPageContext } from "../context";

const MIN_TTS_DURATION_FRAMES = 1;

export function useLayerTts() {
  const { page } = useMainPageContext();
  const { fps } = useVideoConfig();
  const segments = createTtsTimingSegments(page.tts, {
    minDurationSec: 1 / fps,
  });

  const ttsSegments = segments.map((segment, index) => {
    const tts = page.tts[index]!;
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

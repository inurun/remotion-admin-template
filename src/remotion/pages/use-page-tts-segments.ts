import { secondsToFrames } from "@/remotion/utils/timing";
import { staticFile, useVideoConfig } from "remotion";
import { SEQUENCE_TRACK_ID, type SavedTts } from "@/_schemas";
import { useTimeline } from "@/remotion/core/context";

const MIN_TTS_DURATION_FRAMES = 1;

export function usePageTtsSegments(page: { id: string; tts: SavedTts[] }) {
  const { fps } = useVideoConfig();
  const timeline = useTimeline();
  const ttsById = new Map(page.tts.map((tts) => [tts.id, tts]));

  const ttsSegments =
    (timeline.tracks.find((track) => track.id === SEQUENCE_TRACK_ID)?.clips ?? [])
      .find((clip) => clip.id === page.id)
      ?.clips.flatMap((segment) => {
        const tts = ttsById.get(segment.id);
        if (!tts || tts.audio.status !== "ready" || tts.audio.src.trim() === "") {
          return [];
        }
        return [
          {
            ...tts,
            start: secondsToFrames(segment.startSec, fps),
            duration: Math.max(MIN_TTS_DURATION_FRAMES, secondsToFrames(segment.durationSec, fps)),
            audio: {
              src: staticFile(tts.audio.src),
            },
          },
        ];
      }) ?? [];

  return { ttsSegments };
}

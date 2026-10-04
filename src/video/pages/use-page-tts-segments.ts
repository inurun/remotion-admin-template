import { useVideoConfig } from "@inurun/vite-plugin-hyperframes-jsx/runtime";
import type { SavedTts } from "@/_schemas";
import { secondsRangeToFrames } from "@/video-host/frame-utils";
import { getPageClip } from "@/video-host/sequence-clips";
import { useTimeline } from "@/video/core/context";

/** Ready TTS with page-local frames. Audio comes from the static manifest, not the tree. */
export function usePageTtsSegments(page: { id: string; tts: SavedTts[] }) {
  const { fps } = useVideoConfig();
  const timeline = useTimeline();
  const ttsById = new Map(page.tts.map((tts) => [tts.id, tts]));

  const ttsSegments =
    getPageClip(timeline, page.id)?.clips.flatMap((segment) => {
      const tts = ttsById.get(segment.id);
      if (!tts || tts.audio.status !== "ready" || tts.audio.src.trim() === "") {
        return [];
      }
      const range = secondsRangeToFrames(segment.startSec, segment.durationSec, fps);
      return [{ ...tts, start: range.start, duration: range.duration }];
    }) ?? [];

  return { ttsSegments };
}

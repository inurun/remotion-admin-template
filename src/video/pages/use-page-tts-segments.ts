import type { SavedTts } from "@/_schemas";
import { getPageClip } from "@/video-host/sequence-clips";
import { useTimeline } from "@/video/core/context";

/** Ready TTS with page-relative seconds. Audio comes from the static manifest, not the tree. */
export function usePageTtsSegments(page: { id: string; tts: SavedTts[] }) {
  const timeline = useTimeline();
  const ttsById = new Map(page.tts.map((tts) => [tts.id, tts]));

  const ttsSegments =
    getPageClip(timeline, page.id)?.clips.flatMap((segment) => {
      const tts = ttsById.get(segment.id);
      if (!tts || tts.audio.status !== "ready" || tts.audio.src.trim() === "") {
        return [];
      }
      return [{ ...tts, startSec: segment.startSec, durationSec: segment.durationSec }];
    }) ?? [];

  return { ttsSegments };
}

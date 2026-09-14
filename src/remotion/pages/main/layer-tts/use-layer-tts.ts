import { useCurrentFrame } from "remotion";
import { uniqueBy } from "remeda";
import { usePageTtsSegments } from "@/remotion/pages/use-page-tts-segments";
import { useMainPageContext } from "../context";

const SPEAKER_COLORS = ["#c45c4a", "#5b7c99", "#6b8f71", "#c4a35a", "#7a6a9a", "#d08a5a"];

function colorForVoice(voiceName: string) {
  let hash = 0;
  for (const char of voiceName) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return SPEAKER_COLORS[hash % SPEAKER_COLORS.length]!;
}

export function useLayerTts() {
  const { page } = useMainPageContext();
  const { ttsSegments } = usePageTtsSegments(page);
  const frame = useCurrentFrame();
  const speakers = uniqueBy(
    ttsSegments.filter((segment) => segment.voiceName),
    (segment) => segment.voiceName,
  ).map((segment) => {
    const voiceName = segment.voiceName ?? "?";
    return {
      voiceName,
      color: colorForVoice(voiceName),
      initial: voiceName.slice(0, 1).toUpperCase(),
    };
  });
  const current = ttsSegments.find(
    (segment) => frame >= segment.start && frame < segment.start + segment.duration,
  );

  return {
    ttsSegments,
    speakers,
    currentVoiceName: current?.voiceName,
  };
}

import { Audio } from "@remotion/media";
import { Layer } from "@/remotion/components/layter";
import { SequenceUnstyled } from "@/remotion/components/sequence-unstyled";
import { useLayerTts } from "./use-layer-tts";

export function TtsLayer() {
  const { ttsSegments } = useLayerTts();

  return (
    <Layer className="flex justify-center items-center">
      {ttsSegments.map((ttsSegment) => (
        <SequenceUnstyled
          key={ttsSegment.id}
          name={ttsSegment.text}
          from={ttsSegment.start}
          durationInFrames={ttsSegment.duration}
        >
          <p className="text-8xl font-bold font-sans">{ttsSegment.text}</p>
          <Audio src={ttsSegment.audio.src} volume={ttsSegment.volume} />
        </SequenceUnstyled>
      ))}
    </Layer>
  );
}

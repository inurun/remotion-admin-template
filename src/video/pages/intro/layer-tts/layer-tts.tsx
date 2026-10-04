/** @jsxImportSource @inurun/vite-plugin-hyperframes-jsx */
import { Sequence } from "@inurun/vite-plugin-hyperframes-jsx/runtime";
import { Layer } from "@/video/components/layter";
import { useLayerTts } from "./use-layer-tts";

export function TtsLayer() {
  const { ttsSegments } = useLayerTts();

  return (
    <Layer className="flex justify-center items-center">
      {ttsSegments.map((ttsSegment) => (
        <Sequence
          layout="none"
          key={ttsSegment.id}
          from={ttsSegment.start}
          durationInFrames={ttsSegment.duration}
        >
          <p className="text-8xl font-bold font-sans">{ttsSegment.text}</p>
        </Sequence>
      ))}
    </Layer>
  );
}

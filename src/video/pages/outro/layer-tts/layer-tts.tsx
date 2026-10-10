/** @jsxImportSource @inurun/vite-plugin-hyperframes-jsx */
import { Clip } from "@inurun/vite-plugin-hyperframes-jsx/runtime";
import { Layer } from "@/video/components/layter";
import { useLayerTts } from "./use-layer-tts";

export function TtsLayer() {
  const { ttsSegments } = useLayerTts();

  return (
    <Layer>
      {ttsSegments.map((ttsSegment) => (
        <Clip
          start={ttsSegment.startSec}
          duration={ttsSegment.durationSec}
          className="flex justify-center items-center"
        >
          <p className="text-8xl font-bold font-sans">{ttsSegment.text}</p>
        </Clip>
      ))}
    </Layer>
  );
}

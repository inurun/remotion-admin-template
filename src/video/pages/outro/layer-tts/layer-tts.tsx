/** @jsxImportSource @inurun/vite-plugin-hyperframes-jsx */
import { Clip } from "@inurun/vite-plugin-hyperframes-jsx/runtime";
import { Layer } from "@/video/components/layter";
import { Timeline } from "@/video/lib/timeline";
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
          {/* 0s is when this line's clip starts. */}
          <Timeline
            animate={(tl, q) =>
              tl.from(q("p"), { opacity: 0, y: 40, duration: 0.3, ease: "power2.out" })
            }
          >
            <p className="text-8xl font-bold font-sans">{ttsSegment.text}</p>
          </Timeline>
        </Clip>
      ))}
    </Layer>
  );
}

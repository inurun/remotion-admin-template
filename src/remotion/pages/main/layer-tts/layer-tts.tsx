import { Audio } from "@remotion/media";
import { Layer } from "@/remotion/components/layter";
import { SequenceUnstyled } from "@/remotion/components/sequence-unstyled";
import { cn } from "@/_shared/lib/utils";
import { useLayerTts } from "./use-layer-tts";

export function TtsLayer() {
  const { ttsSegments, speakers, currentVoiceName } = useLayerTts();

  return (
    <Layer className="flex items-end justify-center pr-[6%] pb-[14%] pl-[18%]">
      <div className="flex items-end gap-14">
        <div className="z-10 flex flex-col-reverse gap-4">
          {speakers.map((speaker) => (
            <div
              key={speaker.voiceName}
              className={cn(
                "flex size-44 items-center justify-center rounded-full border-4 font-sans text-6xl font-bold text-white",
                currentVoiceName === speaker.voiceName
                  ? "border-white"
                  : "border-transparent opacity-75",
              )}
              style={{ backgroundColor: speaker.color }}
            >
              {speaker.initial}
            </div>
          ))}
        </div>
        <div className="relative min-h-[200px] w-[900px]">
          {ttsSegments.map((ttsSegment) => (
            <SequenceUnstyled
              key={ttsSegment.id}
              name={ttsSegment.text}
              from={ttsSegment.start}
              durationInFrames={ttsSegment.duration}
            >
              <p className="absolute bottom-0 left-0 max-w-[900px] font-sans text-6xl leading-tight font-bold whitespace-pre-wrap text-[#c43b3b]">
                {ttsSegment.text}
              </p>
              <Audio src={ttsSegment.audio.src} volume={ttsSegment.volume} />
            </SequenceUnstyled>
          ))}
        </div>
      </div>
    </Layer>
  );
}

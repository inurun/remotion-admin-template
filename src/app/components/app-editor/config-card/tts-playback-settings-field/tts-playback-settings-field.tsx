import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import { useFormContext, useWatch } from "react-hook-form";
import { Field } from "@/_shared/components/ui/field";
import { Input } from "@/_shared/components/ui/input";
import { useSelectedTts, useTtsFormIndex } from "@/app/features/tts";

const TTS_PLAYBACK_FIELDS = [
  {
    key: "padBeforeSec",
    label: "Before",
    step: "0.1",
    fallback: 0,
    min: undefined,
    max: undefined,
  },
  { key: "padAfterSec", label: "After", step: "0.1", fallback: 0, min: undefined, max: undefined },
  { key: "volume", label: "Volume", step: "0.05", fallback: 1, min: 0, max: 1 },
] as const;

function parseNumberInput(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function BoundTtsPlaybackSettingsField({ ttsIndex }: { ttsIndex: number }) {
  const { control, setValue } = useFormContext<PageFormValues>();
  const name = `tts.${ttsIndex}` as const;
  const item = useWatch({ control, name });

  return (
    <div className="grid gap-2">
      <div className="text-sm font-medium">TTS</div>
      <div className="grid grid-cols-3 gap-2">
        {TTS_PLAYBACK_FIELDS.map((field) => (
          <Field key={field.key}>
            <label className="grid gap-1 text-xs text-muted-foreground">
              <span>{field.label}</span>
              <Input
                type="number"
                step={field.step}
                min={field.min}
                max={field.max}
                value={item?.[field.key] ?? field.fallback}
                onChange={(event) => {
                  setValue(
                    `${name}.${field.key}`,
                    parseNumberInput(event.target.value, field.fallback),
                    {
                      shouldDirty: true,
                      shouldValidate: true,
                    },
                  );
                }}
              />
            </label>
          </Field>
        ))}
      </div>
    </div>
  );
}

export function TtsPlaybackSettingsField() {
  const { ttsId } = useSelectedTts();
  const ttsIndex = useTtsFormIndex(ttsId);

  if (ttsIndex < 0) {
    return null;
  }

  return <BoundTtsPlaybackSettingsField ttsIndex={ttsIndex} />;
}

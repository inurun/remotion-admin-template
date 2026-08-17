import type { VoiceOption, VoicepeakSynthesisSettings } from "@/_schemas";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import { Input } from "@/_shared/components/ui/input";

type SynthesisSettings = NonNullable<TtsFormValues["synthesisSettings"]>;
type SynthesisSettingsKey = string;

const VOISONA_FIELDS = ["alp", "huskiness", "intonation", "pitch", "speed", "volume"] as const;

const VOICEVOX_FIELDS = [
  "speedScale",
  "pitchScale",
  "intonationScale",
  "volumeScale",
  "pauseLength",
  "prePhonemeLength",
  "postPhonemeLength",
  "pauseLengthScale",
] as const;

const VOICEPEAK_FIELDS = ["speed", "pitch"] as const;

const VOICEPEAK_EMOTION_KEYS = [
  "teto-overactive",
  "teto-low-key",
  "teto-whisper",
  "teto-powerful",
  "teto-sweet",
] as const;

function getFields(provider: VoiceOption["provider"]): readonly SynthesisSettingsKey[] {
  if (provider === "voisona") {
    return VOISONA_FIELDS;
  }
  if (provider === "voicepeak") {
    return VOICEPEAK_FIELDS;
  }
  return VOICEVOX_FIELDS;
}

function parseNumberInput(value: string) {
  if (value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseStyleWeightsInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map(Number);
  if (parts.length === 0 || parts.some((entry) => !Number.isFinite(entry))) {
    return undefined;
  }

  return parts;
}

function formatStyleWeights(value: number[] | undefined) {
  return value?.join(", ") ?? "";
}

function normalizeEmotion(
  emotion: VoicepeakSynthesisSettings["emotion"],
): Record<string, number> | undefined {
  if (!emotion) {
    return undefined;
  }

  const entries = Object.entries(emotion).filter(([, entry]) => entry !== undefined);
  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

function normalizeSynthesisSettingsDraft(value: TtsFormValues["synthesisSettings"]) {
  if (!value) {
    return undefined;
  }

  if ("emotion" in value) {
    const { emotion, ...rest } = value;
    const next = Object.fromEntries(
      Object.entries(rest).filter(([, entry]) => entry !== undefined && entry !== null),
    ) as VoicepeakSynthesisSettings;
    const normalizedEmotion = normalizeEmotion(emotion);
    if (normalizedEmotion) {
      next.emotion = normalizedEmotion;
    }
    if (Object.keys(next).length === 0) {
      return undefined;
    }
    return next as SynthesisSettings;
  }

  const entries = Object.entries(value).filter(([key, entry]) => {
    if (entry === undefined || entry === null) {
      return false;
    }
    if (key === "style_weights" && Array.isArray(entry) && entry.length === 0) {
      return false;
    }
    return true;
  });
  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries) as SynthesisSettings;
}

function VoicepeakSynthesisSettingsFields({
  onChange,
  value,
}: {
  onChange: (value: SynthesisSettings | undefined) => void;
  value: TtsFormValues["synthesisSettings"];
}) {
  const settings = (normalizeSynthesisSettingsDraft(value) ?? {}) as VoicepeakSynthesisSettings;
  const emotion = settings.emotion ?? {};

  return (
    <div className="grid gap-2">
      {VOICEPEAK_FIELDS.map((field) => (
        <label
          key={field}
          className="grid grid-cols-[minmax(0,1fr)_140px] items-center gap-3 text-sm"
        >
          <span className="truncate">{field}</span>
          <Input
            type="number"
            step="1"
            value={settings[field] ?? ""}
            onChange={(event) => {
              const next = {
                ...settings,
                [field]: parseNumberInput(event.target.value),
              };
              onChange(normalizeSynthesisSettingsDraft(next));
            }}
          />
        </label>
      ))}
      {VOICEPEAK_EMOTION_KEYS.map((key) => (
        <label
          key={key}
          className="grid grid-cols-[minmax(0,1fr)_140px] items-center gap-3 text-sm"
        >
          <span className="truncate">{key}</span>
          <Input
            type="number"
            step="1"
            value={emotion[key] ?? ""}
            onChange={(event) => {
              const nextEmotion = {
                ...emotion,
                [key]: parseNumberInput(event.target.value),
              };
              const cleanedEmotion = Object.fromEntries(
                Object.entries(nextEmotion).filter(([, entry]) => entry !== undefined),
              ) as Record<string, number>;
              const next: VoicepeakSynthesisSettings = {
                ...settings,
                emotion: Object.keys(cleanedEmotion).length > 0 ? cleanedEmotion : undefined,
              };
              onChange(normalizeSynthesisSettingsDraft(next));
            }}
          />
        </label>
      ))}
    </div>
  );
}

export function SynthesisSettingsFields({
  onChange,
  provider,
  value,
}: {
  onChange: (value: SynthesisSettings | undefined) => void;
  provider: VoiceOption["provider"];
  value: TtsFormValues["synthesisSettings"];
}) {
  if (provider === "voicepeak") {
    return <VoicepeakSynthesisSettingsFields onChange={onChange} value={value} />;
  }

  const settings = normalizeSynthesisSettingsDraft(value) ?? {};
  const styleWeights =
    provider === "voisona" && "style_weights" in settings ? settings.style_weights : undefined;

  return (
    <div className="grid gap-2">
      {getFields(provider).map((field) => (
        <label
          key={field}
          className="grid grid-cols-[minmax(0,1fr)_140px] items-center gap-3 text-sm"
        >
          <span className="truncate">{field}</span>
          <Input
            type="number"
            step="0.01"
            value={(settings as Record<string, number | null | undefined>)[field] ?? ""}
            onChange={(event) => {
              const next = {
                ...settings,
                [field]: parseNumberInput(event.target.value),
              };
              onChange(normalizeSynthesisSettingsDraft(next));
            }}
          />
        </label>
      ))}
      {provider === "voisona" ? (
        <label className="grid grid-cols-[minmax(0,1fr)_140px] items-center gap-3 text-sm">
          <span className="truncate">style_weights</span>
          <Input
            value={formatStyleWeights(styleWeights)}
            placeholder="0, 1, 0"
            onChange={(event) => {
              const next = {
                ...settings,
                style_weights: parseStyleWeightsInput(event.target.value),
              };
              onChange(normalizeSynthesisSettingsDraft(next));
            }}
          />
        </label>
      ) : null}
    </div>
  );
}

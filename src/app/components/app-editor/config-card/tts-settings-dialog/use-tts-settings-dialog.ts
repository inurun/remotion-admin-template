import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import { useFormContext, useWatch } from "react-hook-form";
import type { VoicePreset } from "@/_schemas";
import { SynthesisSettingsFields } from "@/app/features/settings/components/synthesis-settings-fields";
import {
  getEffectiveTtsSynthesisSettings,
  getVoicePresetSettings,
} from "@/_shared/project/voice-presets";
import { useEditorSession } from "@/app/features/editor";
import { useSelectedTts, useTtsFormIndex } from "@/app/features/tts";

export function getDisplayedTtsSynthesisSettings(
  item: Pick<TtsFormValues, "provider" | "voiceName" | "voiceVersion" | "synthesisSettings">,
  presets: VoicePreset[],
) {
  return getEffectiveTtsSynthesisSettings(item, presets);
}

export function toStoredTtsSynthesisSettings(
  value: TtsFormValues["synthesisSettings"] | undefined,
): TtsFormValues["synthesisSettings"] {
  return value ?? null;
}

export function useTtsSettingsDialog() {
  const { ttsId } = useSelectedTts();
  const ttsIndex = useTtsFormIndex(ttsId);
  const { control, setValue } = useFormContext<PageFormValues>();
  const name = `tts.${Math.max(ttsIndex, 0)}` as const;
  const item = useWatch({ control, name });
  const voicePresets = useEditorSession((state) => state.project.voicePresets);

  const setSynthesisSettings: Parameters<typeof SynthesisSettingsFields>[0]["onChange"] = (
    value,
  ) => {
    if (ttsIndex < 0) {
      return;
    }
    setValue(`${name}.synthesisSettings`, toStoredTtsSynthesisSettings(value), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const loadPreset = () => {
    if (!item) {
      return;
    }
    setSynthesisSettings(
      getVoicePresetSettings(voicePresets, {
        provider: item.provider,
        voiceName: item.voiceName ?? "",
        voiceVersion: item.voiceVersion ?? "",
      }),
    );
  };

  return {
    item,
    displayedSynthesisSettings: item
      ? getDisplayedTtsSynthesisSettings(item, voicePresets)
      : undefined,
    loadPreset,
    setSynthesisSettings,
  };
}

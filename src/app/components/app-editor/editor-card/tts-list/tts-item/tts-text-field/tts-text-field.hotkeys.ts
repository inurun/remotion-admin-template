import { useCallback, type KeyboardEvent } from "react";
import { useFormContext } from "react-hook-form";
import type { VoiceOption } from "@/_schemas";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import { useTts } from "@/app/features/tts";
import { eventMatchesHotkey } from "@/app/features/settings/lib/hotkeys";
import { getVoiceId, useSettings } from "@/app/features/settings";
import type { VoiceSettings } from "@/app/features/settings/storage/use-settings-store";

function getVoiceForHotkey(
  event: globalThis.KeyboardEvent,
  options: VoiceOption[],
  voiceSettings: Record<string, VoiceSettings>,
) {
  return options.find((option) =>
    eventMatchesHotkey(event, voiceSettings[getVoiceId(option)]?.hotkey ?? ""),
  );
}

function setTtsVoice({
  setValue,
  ttsIndex,
  voice,
}: {
  setValue: ReturnType<typeof useFormContext<PageFormValues>>["setValue"];
  ttsIndex: number;
  voice: VoiceOption;
}) {
  setValue(`tts.${ttsIndex}.voiceName`, voice.voiceName, { shouldDirty: true });
  setValue(`tts.${ttsIndex}.provider`, voice.provider, { shouldDirty: true });
  setValue(`tts.${ttsIndex}.voiceVersion`, voice.voiceVersion ?? "", { shouldDirty: true });
}

export function useTtsTextFieldKeyDown({
  ttsId,
  ttsIndex,
  onInsertAfter,
  onRemove,
}: {
  ttsId: string;
  ttsIndex: number;
  onInsertAfter: (index: number) => void;
  onRemove: () => void;
}) {
  const { analyze } = useTts();
  const { hotkeys, options, voiceSettings } = useSettings();
  const { setValue } = useFormContext<PageFormValues>();

  return useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.repeat) {
        return;
      }

      if (eventMatchesHotkey(event.nativeEvent, hotkeys.deleteTts)) {
        event.preventDefault();
        onRemove();
        return;
      }

      if (eventMatchesHotkey(event.nativeEvent, hotkeys.addTts)) {
        event.preventDefault();
        onInsertAfter(ttsIndex);
        return;
      }

      if (eventMatchesHotkey(event.nativeEvent, hotkeys.analyze)) {
        event.preventDefault();
        void analyze(ttsId);
        return;
      }

      const voice = getVoiceForHotkey(event.nativeEvent, options, voiceSettings);
      if (!voice) {
        return;
      }

      event.preventDefault();
      setTtsVoice({ setValue, ttsIndex, voice });
    },
    [
      analyze,
      hotkeys.addTts,
      hotkeys.analyze,
      hotkeys.deleteTts,
      onInsertAfter,
      onRemove,
      options,
      setValue,
      ttsId,
      ttsIndex,
      voiceSettings,
    ],
  );
}

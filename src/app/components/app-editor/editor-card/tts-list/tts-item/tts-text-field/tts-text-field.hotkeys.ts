import { useCallback, type KeyboardEvent } from "react";
import { useFormContext } from "react-hook-form";
import type { DraftProject, VoiceOption } from "@/_schemas";
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
  pageIndex,
  setValue,
  ttsIndex,
  voice,
}: {
  pageIndex: number;
  setValue: ReturnType<typeof useFormContext<DraftProject>>["setValue"];
  ttsIndex: number;
  voice: VoiceOption;
}) {
  setValue(`pages.${pageIndex}.tts.${ttsIndex}.voiceName`, voice.voiceName, {
    shouldDirty: true,
  });
  setValue(`pages.${pageIndex}.tts.${ttsIndex}.provider`, voice.provider, {
    shouldDirty: true,
  });
  setValue(`pages.${pageIndex}.tts.${ttsIndex}.voiceVersion`, voice.voiceVersion ?? "", {
    shouldDirty: true,
  });
}

export function useTtsTextFieldKeyDown({
  pageIndex,
  ttsIndex,
  onInsertAfter,
  onRemove,
}: {
  pageIndex: number;
  ttsIndex: number;
  onInsertAfter: (index: number) => void;
  onRemove: () => void;
}) {
  const { analyze } = useTts();
  const { hotkeys, options, voiceSettings } = useSettings();
  const { setValue } = useFormContext<DraftProject>();

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
        void analyze(pageIndex, ttsIndex);
        return;
      }

      const voice = getVoiceForHotkey(event.nativeEvent, options, voiceSettings);
      if (!voice) {
        return;
      }

      event.preventDefault();
      setTtsVoice({ pageIndex, setValue, ttsIndex, voice });
    },
    [
      analyze,
      hotkeys.addTts,
      hotkeys.analyze,
      hotkeys.deleteTts,
      onInsertAfter,
      onRemove,
      options,
      pageIndex,
      setValue,
      ttsIndex,
      voiceSettings,
    ],
  );
}

import type { VoiceOption } from "@/_schemas";
import { getVoiceId } from "@/app/features/settings";
import { eventMatchesHotkey } from "@/app/features/settings/lib/hotkeys";
import type { VoiceSettings } from "@/app/features/settings/storage/use-settings-store";

export function getComposerHotkeyVoice(
  event: KeyboardEvent,
  options: VoiceOption[],
  voiceSettings: Record<string, VoiceSettings>,
) {
  return options.find((option) =>
    eventMatchesHotkey(event, voiceSettings[getVoiceId(option)]?.hotkey ?? ""),
  );
}

// fallow-ignore-file unused-export -- helpers are covered by colocated unit tests
import { useCallback } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { APP_HOTKEY_LABELS, DEFAULT_HOTKEYS, type AppHotkeyAction } from "@/app/features/settings";
import type { SettingsFormValues } from "@/app/components/app-sidebar/settings-dialog/use-settings-dialog";

export function createResetHotkeysValues(current: SettingsFormValues): SettingsFormValues {
  return {
    ...current,
    hotkeys: { ...DEFAULT_HOTKEYS },
    voiceSettings: current.voiceSettings.map((setting) => ({ ...setting, hotkey: "" })),
  };
}

export function useHotkeysSection(form: UseFormReturn<SettingsFormValues>) {
  const hotkeys = useWatch({ control: form.control, name: "hotkeys" });
  const actions = Object.keys(APP_HOTKEY_LABELS) as AppHotkeyAction[];

  const setAppHotkey = useCallback(
    (action: AppHotkeyAction, hotkey: string) => {
      form.setValue(`hotkeys.${action}`, hotkey, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [form],
  );

  const resetHotkeys = useCallback(() => {
    form.reset(createResetHotkeysValues(form.getValues()));
  }, [form]);

  return {
    actions,
    hotkeys: hotkeys ?? form.getValues("hotkeys"),
    getAppHotkeyError: (action: AppHotkeyAction) =>
      form.getFieldState(`hotkeys.${action}`, form.formState).error?.message,
    resetHotkeys,
    setAppHotkey,
  };
}

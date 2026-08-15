// fallow-ignore-file unused-export

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { VoiceOption } from "@/_schemas";
import {
  DEFAULT_HOTKEYS,
  normalizeHotkey,
  type AppHotkeys,
} from "@/app/features/settings/lib/hotkeys";
import { mergeVoiceOrder } from "@/app/features/settings/lib/settings";

export const SETTINGS_STORAGE_KEY = "remotion-voisona-settings";

export type VoiceSettings = {
  label: string;
  alias: string;
  hotkey: string;
};

export type SettingsSnapshot = {
  voices: VoiceOption[];
  voiceOrder: string[];
  voiceSettings: Record<string, VoiceSettings>;
  hotkeys: AppHotkeys;
};

type SettingsState = SettingsSnapshot & {
  saveSettings: (settings: SettingsSnapshot) => void;
  mergeFetchedVoices: (voices: VoiceOption[]) => void;
  resetHotkeys: () => void;
};

export function getDefaultSettings(): SettingsSnapshot {
  return {
    voices: [],
    voiceOrder: [],
    voiceSettings: {},
    hotkeys: { ...DEFAULT_HOTKEYS },
  };
}

function normalizeHotkeys(hotkeys: AppHotkeys): AppHotkeys {
  return Object.fromEntries(
    (Object.keys(DEFAULT_HOTKEYS) as Array<keyof AppHotkeys>).map((action) => [
      action,
      normalizeHotkey(hotkeys[action]),
    ]),
  ) as AppHotkeys;
}

export function normalizeSettings(settings: SettingsSnapshot): SettingsSnapshot {
  return {
    voices: settings.voices,
    voiceOrder: mergeVoiceOrder(settings.voiceOrder, settings.voices),
    voiceSettings: Object.fromEntries(
      Object.entries(settings.voiceSettings).map(([voiceId, value]) => [
        voiceId,
        {
          label: value.label,
          alias: value.alias?.trim() ?? "",
          hotkey: normalizeHotkey(value.hotkey),
        },
      ]),
    ),
    hotkeys: normalizeHotkeys(settings.hotkeys),
  };
}

export function hasStoredSettings() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SETTINGS_STORAGE_KEY) !== null;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...getDefaultSettings(),
      saveSettings: (settings) => {
        set(normalizeSettings(settings));
      },
      mergeFetchedVoices: (voices) => {
        const current = get();
        set({
          voices,
          voiceOrder: mergeVoiceOrder(current.voiceOrder, voices),
        });
      },
      resetHotkeys: () => {
        set({ hotkeys: { ...DEFAULT_HOTKEYS } });
      },
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        voices: state.voices,
        voiceOrder: state.voiceOrder,
        voiceSettings: state.voiceSettings,
        hotkeys: state.hotkeys,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<SettingsSnapshot>;
        return {
          ...current,
          ...normalizeSettings({
            ...getDefaultSettings(),
            ...persistedState,
            hotkeys: {
              ...DEFAULT_HOTKEYS,
              ...persistedState.hotkeys,
            },
          }),
        };
      },
    },
  ),
);

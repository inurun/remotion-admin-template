// fallow-ignore-file unused-export

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const UI_PREFERENCES_STORAGE_KEY = "remotion-voisona-ui-preferences";

type UiPreferencesState = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

export function hasStoredUiPreferences() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(UI_PREFERENCES_STORAGE_KEY) !== null;
}

export const useUiPreferencesStore = create<UiPreferencesState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => {
        set({ sidebarOpen });
      },
    }),
    {
      name: UI_PREFERENCES_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
      }),
    },
  ),
);

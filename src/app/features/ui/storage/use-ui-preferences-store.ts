// fallow-ignore-file unused-export

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { clampSidebarWidth, DEFAULT_SIDEBAR_WIDTH } from "@/_shared/lib/sidebar-width";

export const UI_PREFERENCES_STORAGE_KEY = "remotion-voisona-ui-preferences";

export type EditorPanelId = "editor" | "preview" | "config";

type UiPreferencesState = {
  sidebarOpen: boolean;
  sidebarWidth: number;
  editorOpen: boolean;
  previewOpen: boolean;
  configOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setPanelOpen: (panel: EditorPanelId, open: boolean) => void;
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
      sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
      editorOpen: true,
      previewOpen: true,
      configOpen: true,
      setSidebarOpen: (sidebarOpen) => {
        set({ sidebarOpen });
      },
      setSidebarWidth: (sidebarWidth) => {
        set({ sidebarWidth: clampSidebarWidth(sidebarWidth) });
      },
      setPanelOpen: (panel, open) => {
        if (panel === "editor") {
          set({ editorOpen: open });
          return;
        }
        if (panel === "preview") {
          set({ previewOpen: open });
          return;
        }
        set({ configOpen: open });
      },
    }),
    {
      name: UI_PREFERENCES_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        sidebarWidth: state.sidebarWidth,
        editorOpen: state.editorOpen,
        previewOpen: state.previewOpen,
        configOpen: state.configOpen,
      }),
    },
  ),
);

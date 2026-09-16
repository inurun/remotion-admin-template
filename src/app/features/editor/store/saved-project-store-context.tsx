import { createContext, useContext, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import type { SavedProject, SavedTimeline } from "@/_schemas";
import { EMPTY_TIMELINE } from "@/_schemas";
import {
  createSavedProjectStore,
  type SavedProjectStore,
  type SavedProjectStoreApi,
} from "@/app/features/editor/store/saved-project-store";

const SavedProjectStoreContext = createContext<SavedProjectStoreApi | null>(null);

export function SavedProjectStoreProvider({
  initialProject,
  initialTimeline = EMPTY_TIMELINE,
  children,
}: {
  initialProject: SavedProject;
  initialTimeline?: SavedTimeline;
  children: ReactNode;
}) {
  const storeRef = useRef<SavedProjectStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = createSavedProjectStore(initialProject, initialTimeline);
  }

  return (
    <SavedProjectStoreContext.Provider value={storeRef.current}>
      {children}
    </SavedProjectStoreContext.Provider>
  );
}

export function useSavedProjectStoreApi() {
  const store = useContext(SavedProjectStoreContext);
  if (!store) {
    throw new Error("SavedProjectStore is missing");
  }
  return store;
}

export function useSavedProject<T>(selector: (state: SavedProjectStore) => T): T {
  return useStore(useSavedProjectStoreApi(), selector);
}

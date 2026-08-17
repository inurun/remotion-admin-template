import { createContext, useContext, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import type { SavedProject } from "@/_schemas";
import {
  createSavedProjectStore,
  type SavedProjectStore,
  type SavedProjectStoreApi,
} from "@/app/features/editor/store/saved-project-store";

const SavedProjectStoreContext = createContext<SavedProjectStoreApi | null>(null);

export function SavedProjectStoreProvider({
  initialProject,
  children,
}: {
  initialProject: SavedProject;
  children: ReactNode;
}) {
  const storeRef = useRef<SavedProjectStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = createSavedProjectStore(initialProject);
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

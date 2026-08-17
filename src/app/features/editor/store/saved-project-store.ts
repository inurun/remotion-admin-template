import { createStore, type StoreApi } from "zustand/vanilla";
import type { SavedProject } from "@/_schemas";
import {
  applySavedProjectHydrate,
  applySavedProjectSaveResult,
  createSavedProjectState,
  type SavedProjectState,
  type SaveProjectResult,
} from "@/app/features/editor/store/saved-project-state";

export type SavedProjectStore = SavedProjectState & {
  hydrate: (project: SavedProject) => void;
  applySaveResult: (result: SaveProjectResult) => void;
};

export type SavedProjectStoreApi = StoreApi<SavedProjectStore>;

export function createSavedProjectStore(project: SavedProject): SavedProjectStoreApi {
  return createStore<SavedProjectStore>()((set) => ({
    ...createSavedProjectState(project),
    hydrate: (nextProject: SavedProject) => {
      set((state) => applySavedProjectHydrate(state, nextProject));
    },
    applySaveResult: (result: SaveProjectResult) => {
      set((state) => applySavedProjectSaveResult(state, result));
    },
  }));
}

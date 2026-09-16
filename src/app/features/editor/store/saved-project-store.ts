import { createStore, type StoreApi } from "zustand/vanilla";
import type { SavedProject, SavedTimeline } from "@/_schemas";
import { EMPTY_TIMELINE } from "@/_schemas";
import {
  applySavedProjectHydrate,
  applySavedProjectSaveResult,
  applySavedProjectExternalUpdate,
  createSavedProjectState,
  type SavedProjectState,
  type SaveProjectResult,
} from "@/app/features/editor/store/saved-project-state";

export type SavedProjectStore = SavedProjectState & {
  hydrate: (project: SavedProject, timeline?: SavedTimeline) => void;
  applySaveResult: (result: SaveProjectResult) => void;
  applyExternalProject: (project: SavedProject, timeline?: SavedTimeline) => void;
};

export type SavedProjectStoreApi = StoreApi<SavedProjectStore>;

export function createSavedProjectStore(
  project: SavedProject,
  timeline: SavedTimeline = EMPTY_TIMELINE,
): SavedProjectStoreApi {
  return createStore<SavedProjectStore>()((set) => ({
    ...createSavedProjectState(project, timeline),
    hydrate: (nextProject: SavedProject, nextTimeline = EMPTY_TIMELINE) => {
      set((state) => applySavedProjectHydrate(state, nextProject, nextTimeline));
    },
    applySaveResult: (result: SaveProjectResult) => {
      set((state) => applySavedProjectSaveResult(state, result));
    },
    applyExternalProject: (project: SavedProject, nextTimeline = EMPTY_TIMELINE) => {
      set((state) => applySavedProjectExternalUpdate(state, project, nextTimeline));
    },
  }));
}

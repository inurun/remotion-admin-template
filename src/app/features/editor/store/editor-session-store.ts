import { createStore, type StoreApi } from "zustand/vanilla";
import type { SavedProject } from "@/_schemas";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import type { TransitionFormValues } from "@/app/features/page/model/transition-form-schema";
import type { ProjectSettingsFormValues } from "@/app/features/project/model/project-settings-form-schema";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import {
  applyAddTts,
  applyInsertSequenceItem,
  applyMarkSaved,
  applyRemoveSequenceItem,
  applyRemoveTts,
  applyReorderSequence,
  applySaveSuccess,
  applyUpdateProjectSettings,
  applyUpdateTts,
  applyUpsertPage,
  createEditorSessionState,
  type EditorSavedChangeSet,
  type EditorSessionActions,
  type EditorSessionState,
} from "@/app/features/editor/store/editor-session-state";
import type { SaveProjectResult } from "@/app/features/editor/store/saved-project-state";

export type EditorSessionStore = EditorSessionState & EditorSessionActions;
export type EditorSessionStoreApi = StoreApi<EditorSessionStore>;

export function createEditorSessionStore(project: SavedProject): EditorSessionStoreApi {
  return createStore<EditorSessionStore>()((set) => ({
    ...createEditorSessionState(project),
    updateProjectSettings: (input: ProjectSettingsFormValues) => {
      set((state) => applyUpdateProjectSettings(state, input));
    },
    upsertPage: (pageId: string, input: PageFormValues) => {
      set((state) => applyUpsertPage(state, pageId, input));
    },
    addTts: (pageId: string, input: TtsFormValues) => {
      set((state) => applyAddTts(state, pageId, input));
    },
    updateTts: (pageId: string, ttsId: string, input: TtsFormValues) => {
      set((state) => applyUpdateTts(state, pageId, ttsId, input));
    },
    removeTts: (pageId: string, ttsId: string) => {
      set((state) => applyRemoveTts(state, pageId, ttsId));
    },
    insertSequenceItem: (input: PageFormValues | TransitionFormValues, position: number) => {
      set((state) => applyInsertSequenceItem(state, input, position));
    },
    removeSequenceItem: (itemId: string) => {
      set((state) => applyRemoveSequenceItem(state, itemId));
    },
    reorderSequence: (itemIds: string[]) => {
      set((state) => applyReorderSequence(state, itemIds));
    },
    markSaved: (savedChangeSet: EditorSavedChangeSet) => {
      set((state) => applyMarkSaved(state, savedChangeSet));
    },
    applySaveSuccess: (result: SaveProjectResult, savedChangeSet: EditorSavedChangeSet) => {
      set((state) => applySaveSuccess(state, result, savedChangeSet));
    },
    hydrate: (nextProject: SavedProject) => {
      set((state) => ({
        ...state,
        ...createEditorSessionState(nextProject),
      }));
    },
  }));
}

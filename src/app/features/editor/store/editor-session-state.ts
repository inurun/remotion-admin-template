import { isContentPage, isSavedContentPage, type SavedProject } from "@/_schemas";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import type { TransitionFormValues } from "@/app/features/page/model/transition-form-schema";
import type { ProjectSettingsFormValues } from "@/app/features/project/model/project-settings-form-schema";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import {
  mergeSavedSpeechIntoPageForm,
  toPageFormValues,
  toProjectSettingsFormValues,
  toSequenceFormItem,
} from "@/app/features/editor/lib/project-form-conversion";
import type { SaveProjectResult } from "@/app/features/editor/store/saved-project-state";

export type EditorSessionDirty = {
  project: number;
  sequence: number;
  itemIds: Record<string, number>;
  removedItemIds: Record<string, number>;
};

export type EditorSessionState = {
  project: ProjectSettingsFormValues;
  sequenceOrder: string[];
  itemsById: Record<string, PageFormValues | TransitionFormValues>;
  dirty: EditorSessionDirty;
  itemReconcileRevision: Record<string, number>;
};

export type EditorSavedChangeSet = {
  project: number;
  sequence: number;
  itemIds: Record<string, number>;
  removedItemIds: Record<string, number>;
};

export type SaveProjectChangesInput = {
  project?: ProjectSettingsFormValues;
  upsertItems: Array<PageFormValues | TransitionFormValues>;
  removedItemIds: string[];
  sequenceOrder?: string[];
  forceResynthesis?: boolean;
};

function emptyDirty(): EditorSessionDirty {
  return {
    project: 0,
    sequence: 0,
    itemIds: {},
    removedItemIds: {},
  };
}

function bump(version: number | undefined) {
  return (version ?? 0) + 1;
}

export function createEditorSessionState(project: SavedProject): EditorSessionState {
  const itemsById: Record<string, PageFormValues | TransitionFormValues> = {};
  for (const item of project.pages) {
    itemsById[item.id] = toSequenceFormItem(item);
  }

  return {
    project: toProjectSettingsFormValues(project),
    sequenceOrder: project.pages.map((item) => item.id),
    itemsById,
    dirty: emptyDirty(),
    itemReconcileRevision: {},
  };
}

function markItemDirty(dirty: EditorSessionDirty, itemId: string): EditorSessionDirty {
  const nextRemoved = { ...dirty.removedItemIds };
  delete nextRemoved[itemId];
  return {
    ...dirty,
    itemIds: { ...dirty.itemIds, [itemId]: bump(dirty.itemIds[itemId]) },
    removedItemIds: nextRemoved,
  };
}

function isSameSnapshot(left: unknown, right: unknown) {
  return left === right || JSON.stringify(left) === JSON.stringify(right);
}

function replacePage(
  state: EditorSessionState,
  pageId: string,
  nextPage: PageFormValues,
): EditorSessionState {
  return {
    ...state,
    itemsById: {
      ...state.itemsById,
      [pageId]: nextPage,
    },
    dirty: markItemDirty(state.dirty, pageId),
  };
}

function getPage(state: EditorSessionState, pageId: string): PageFormValues | null {
  const item = state.itemsById[pageId];
  if (!item || item.type === "transition") {
    return null;
  }
  return item;
}

export type EditorSessionActions = {
  updateProjectSettings: (input: ProjectSettingsFormValues) => void;
  upsertPage: (pageId: string, input: PageFormValues) => void;
  addTts: (pageId: string, input: TtsFormValues) => void;
  updateTts: (pageId: string, ttsId: string, input: TtsFormValues) => void;
  removeTts: (pageId: string, ttsId: string) => void;
  insertSequenceItem: (input: PageFormValues | TransitionFormValues, position: number) => void;
  removeSequenceItem: (itemId: string) => void;
  reorderSequence: (itemIds: string[]) => void;
  markSaved: (savedChangeSet: EditorSavedChangeSet) => void;
  applySaveSuccess: (result: SaveProjectResult, savedChangeSet: EditorSavedChangeSet) => void;
  hydrate: (project: SavedProject) => void;
};

export function applyUpdateProjectSettings(
  state: EditorSessionState,
  input: ProjectSettingsFormValues,
): EditorSessionState {
  if (isSameSnapshot(state.project, input)) {
    return state;
  }

  return {
    ...state,
    project: input,
    dirty: { ...state.dirty, project: bump(state.dirty.project) },
  };
}

export function applyUpsertPage(
  state: EditorSessionState,
  pageId: string,
  input: PageFormValues,
): EditorSessionState {
  const exists = Boolean(state.itemsById[pageId]);
  if (exists && state.itemsById[pageId] === input && input.id === pageId) {
    return state;
  }

  const nextItem = { ...input, id: pageId };

  return {
    ...state,
    sequenceOrder: exists ? state.sequenceOrder : [...state.sequenceOrder, pageId],
    itemsById: {
      ...state.itemsById,
      [pageId]: nextItem,
    },
    dirty: {
      ...markItemDirty(state.dirty, pageId),
      sequence: exists ? state.dirty.sequence : bump(state.dirty.sequence),
    },
  };
}

export function applyAddTts(
  state: EditorSessionState,
  pageId: string,
  input: TtsFormValues,
): EditorSessionState {
  const page = getPage(state, pageId);
  if (!page) {
    return state;
  }

  return replacePage(state, pageId, {
    ...page,
    tts: [...page.tts, input],
  });
}

export function applyUpdateTts(
  state: EditorSessionState,
  pageId: string,
  ttsId: string,
  input: TtsFormValues,
): EditorSessionState {
  const page = getPage(state, pageId);
  if (!page) {
    return state;
  }

  let changed = false;
  const tts = page.tts.map((item) => {
    if (item.id !== ttsId) {
      return item;
    }
    changed = true;
    return { ...input, id: ttsId };
  });

  if (!changed) {
    return state;
  }

  return replacePage(state, pageId, { ...page, tts });
}

export function applyRemoveTts(
  state: EditorSessionState,
  pageId: string,
  ttsId: string,
): EditorSessionState {
  const page = getPage(state, pageId);
  if (!page) {
    return state;
  }

  const tts = page.tts.filter((item) => item.id !== ttsId);
  if (tts.length === page.tts.length) {
    return state;
  }

  return replacePage(state, pageId, { ...page, tts });
}

export function applyInsertSequenceItem(
  state: EditorSessionState,
  input: PageFormValues | TransitionFormValues,
  position: number,
): EditorSessionState {
  const nextOrder = [...state.sequenceOrder];
  const insertAt = Math.min(Math.max(position, 0), nextOrder.length);
  nextOrder.splice(insertAt, 0, input.id);
  const nextRemoved = { ...state.dirty.removedItemIds };
  delete nextRemoved[input.id];

  return {
    ...state,
    sequenceOrder: nextOrder,
    itemsById: {
      ...state.itemsById,
      [input.id]: input,
    },
    dirty: {
      ...state.dirty,
      sequence: bump(state.dirty.sequence),
      itemIds: { ...state.dirty.itemIds, [input.id]: bump(state.dirty.itemIds[input.id]) },
      removedItemIds: nextRemoved,
    },
  };
}

export function applyRemoveSequenceItem(
  state: EditorSessionState,
  itemId: string,
): EditorSessionState {
  if (!state.sequenceOrder.includes(itemId) && !state.itemsById[itemId]) {
    return state;
  }

  const nextItems = { ...state.itemsById };
  delete nextItems[itemId];
  const nextItemIds = { ...state.dirty.itemIds };
  delete nextItemIds[itemId];

  return {
    ...state,
    sequenceOrder: state.sequenceOrder.filter((id) => id !== itemId),
    itemsById: nextItems,
    dirty: {
      ...state.dirty,
      sequence: bump(state.dirty.sequence),
      itemIds: nextItemIds,
      removedItemIds: {
        ...state.dirty.removedItemIds,
        [itemId]: bump(state.dirty.removedItemIds[itemId]),
      },
    },
  };
}

export function applyReorderSequence(
  state: EditorSessionState,
  itemIds: string[],
): EditorSessionState {
  if (isSameSnapshot(state.sequenceOrder, itemIds)) {
    return state;
  }

  return {
    ...state,
    sequenceOrder: itemIds,
    dirty: { ...state.dirty, sequence: bump(state.dirty.sequence) },
  };
}

export function captureDirtySnapshot(state: EditorSessionState): EditorSavedChangeSet {
  return {
    project: state.dirty.project,
    sequence: state.dirty.sequence,
    itemIds: { ...state.dirty.itemIds },
    removedItemIds: { ...state.dirty.removedItemIds },
  };
}

function clearMatchingVersion(current: number, saved: number): number {
  return saved > 0 && current === saved ? 0 : current;
}

export function applyMarkSaved(
  state: EditorSessionState,
  savedChangeSet: EditorSavedChangeSet,
): EditorSessionState {
  const nextItemIds = { ...state.dirty.itemIds };
  for (const [itemId, version] of Object.entries(savedChangeSet.itemIds)) {
    if (nextItemIds[itemId] === version) {
      delete nextItemIds[itemId];
    }
  }

  const nextRemoved = { ...state.dirty.removedItemIds };
  for (const [itemId, version] of Object.entries(savedChangeSet.removedItemIds)) {
    if (nextRemoved[itemId] === version) {
      delete nextRemoved[itemId];
    }
  }

  return {
    ...state,
    dirty: {
      project: clearMatchingVersion(state.dirty.project, savedChangeSet.project),
      sequence: clearMatchingVersion(state.dirty.sequence, savedChangeSet.sequence),
      itemIds: nextItemIds,
      removedItemIds: nextRemoved,
    },
  };
}

export function applyReconcileSavedSpeech(
  state: EditorSessionState,
  result: SaveProjectResult,
  savedChangeSet: EditorSavedChangeSet,
): EditorSessionState {
  const savedById = new Map(result.project.pages.map((item) => [item.id, item]));
  let itemsById = state.itemsById;
  let itemReconcileRevision = state.itemReconcileRevision;
  let copied = false;

  for (const itemId of result.updatedItemIds) {
    if ((state.dirty.itemIds[itemId] ?? 0) !== (savedChangeSet.itemIds[itemId] ?? 0)) {
      continue;
    }

    const current = itemsById[itemId];
    if (!current || current.type === "transition") {
      continue;
    }

    const savedItem = savedById.get(itemId);
    if (!savedItem || !isSavedContentPage(savedItem)) {
      continue;
    }

    const nextPage = mergeSavedSpeechIntoPageForm(current, toPageFormValues(savedItem));
    if (nextPage === current) {
      continue;
    }

    if (!copied) {
      itemsById = { ...state.itemsById };
      itemReconcileRevision = { ...state.itemReconcileRevision };
      copied = true;
    }

    itemsById[itemId] = nextPage;
    itemReconcileRevision[itemId] = bump(itemReconcileRevision[itemId]);
  }

  if (!copied) {
    return state;
  }

  return {
    ...state,
    itemsById,
    itemReconcileRevision,
  };
}

export function applySaveSuccess(
  state: EditorSessionState,
  result: SaveProjectResult,
  savedChangeSet: EditorSavedChangeSet,
): EditorSessionState {
  return applyMarkSaved(applyReconcileSavedSpeech(state, result, savedChangeSet), savedChangeSet);
}

export function hasDirtyChanges(state: EditorSessionState) {
  return (
    state.dirty.project > 0 ||
    state.dirty.sequence > 0 ||
    Object.keys(state.dirty.itemIds).length > 0 ||
    Object.keys(state.dirty.removedItemIds).length > 0
  );
}

export function buildSaveChangeSet(
  state: EditorSessionState,
  options?: { forceResynthesis?: boolean },
): SaveProjectChangesInput {
  const upsertItems = Object.keys(state.dirty.itemIds).flatMap((itemId) => {
    const item = state.itemsById[itemId];
    return item ? [item] : [];
  });

  return {
    ...(state.dirty.project > 0 ? { project: state.project } : {}),
    upsertItems,
    removedItemIds: Object.keys(state.dirty.removedItemIds),
    ...(state.dirty.sequence > 0 ? { sequenceOrder: state.sequenceOrder } : {}),
    ...(options?.forceResynthesis ? { forceResynthesis: true } : {}),
  };
}

export function isSequencePage(
  item: PageFormValues | TransitionFormValues,
): item is PageFormValues {
  return isContentPage(item);
}

export function selectSequenceOrder(state: Pick<EditorSessionState, "sequenceOrder">) {
  return state.sequenceOrder;
}

export function selectItemType(state: Pick<EditorSessionState, "itemsById">, itemId: string) {
  return state.itemsById[itemId]?.type;
}

export function selectItemDirtyVersion(state: Pick<EditorSessionState, "dirty">, itemId: string) {
  return state.dirty.itemIds[itemId] ?? 0;
}

export function selectItemReconcileRevision(
  state: Pick<EditorSessionState, "itemReconcileRevision">,
  itemId: string,
) {
  return state.itemReconcileRevision[itemId] ?? 0;
}

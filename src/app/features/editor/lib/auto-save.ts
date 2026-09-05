import { AUTO_SAVE_DELAY } from "@/constants";
import type { EditorSessionStoreApi } from "@/app/features/editor/store/editor-session-store";
import {
  hasDirtyChanges,
  type EditorSessionDirty,
} from "@/app/features/editor/store/editor-session-state";

const cancellations = new WeakMap<EditorSessionStoreApi, () => void>();

export function cancelScheduledAutoSave(store: EditorSessionStoreApi) {
  cancellations.get(store)?.();
}

function hasNewEdits(next: EditorSessionDirty, previous: EditorSessionDirty) {
  return (
    next.project > previous.project ||
    next.sequence > previous.sequence ||
    Object.entries(next.itemIds).some(([id, version]) => version > (previous.itemIds[id] ?? 0)) ||
    Object.entries(next.removedItemIds).some(
      ([id, version]) => version > (previous.removedItemIds[id] ?? 0),
    )
  );
}

export function watchAutoSave(store: EditorSessionStoreApi, save: () => Promise<void>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  cancellations.set(store, cancel);
  const schedule = () => {
    cancel();
    timer = setTimeout(() => {
      timer = undefined;
      if (hasDirtyChanges(store.getState())) void save().catch(() => {});
    }, AUTO_SAVE_DELAY);
  };
  if (hasDirtyChanges(store.getState())) schedule();
  const unsubscribe = store.subscribe((next, previous) => {
    if (!hasDirtyChanges(next)) cancel();
    else if (hasNewEdits(next.dirty, previous.dirty)) schedule();
  });
  return () => {
    cancel();
    unsubscribe();
    cancellations.delete(store);
  };
}

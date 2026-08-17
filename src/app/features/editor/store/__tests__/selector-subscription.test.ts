import { describe, expect, it } from "vitest";
import {
  selectItemDirtyVersion,
  selectItemType,
  selectSequenceOrder,
} from "@/app/features/editor/store/editor-session-state";
import { createEditorSessionStore } from "@/app/features/editor/store/editor-session-store";
import { selectPageThumbnailBindingKey } from "@/app/features/editor/store/saved-project-state";
import { createSavedProjectStore } from "@/app/features/editor/store/saved-project-store";
import { createSavedMainPage, createSavedProject, createSavedTts } from "./fixtures";

function countSelectorNotifications<State, Selected>(
  subscribe: (listener: () => void) => () => void,
  getState: () => State,
  selector: (state: State) => Selected,
) {
  let current = selector(getState());
  let count = 0;
  const unsubscribe = subscribe(() => {
    const next = selector(getState());
    if (!Object.is(current, next)) {
      current = next;
      count += 1;
    }
  });
  return {
    get count() {
      return count;
    },
    unsubscribe,
  };
}

describe("editor subscription boundaries", () => {
  it("does not notify the page-list structure or another thumbnail binding when page content is edited", () => {
    const project = createSavedProject({
      pages: [
        createSavedMainPage({ id: "page-a", title: "A" }),
        createSavedMainPage({
          id: "page-b",
          title: "B",
          tts: [createSavedTts({ id: "tts-b" })],
        }),
      ],
    });
    const editorStore = createEditorSessionStore(project);
    const savedStore = createSavedProjectStore(project);

    const pageListStructure = countSelectorNotifications(
      editorStore.subscribe,
      editorStore.getState,
      selectSequenceOrder,
    );
    const otherItemType = countSelectorNotifications(
      editorStore.subscribe,
      editorStore.getState,
      (state) => selectItemType(state, "page-b"),
    );
    const otherItemDirty = countSelectorNotifications(
      editorStore.subscribe,
      editorStore.getState,
      (state) => selectItemDirtyVersion(state, "page-b") > 0,
    );
    const editedItemDirty = countSelectorNotifications(
      editorStore.subscribe,
      editorStore.getState,
      (state) => selectItemDirtyVersion(state, "page-a") > 0,
    );
    const otherThumbnail = countSelectorNotifications(
      savedStore.subscribe,
      savedStore.getState,
      (state) => selectPageThumbnailBindingKey(state, "page-b"),
    );
    const editedThumbnail = countSelectorNotifications(
      savedStore.subscribe,
      savedStore.getState,
      (state) => selectPageThumbnailBindingKey(state, "page-a"),
    );

    const pageABefore = editorStore.getState().itemsById["page-a"];
    editorStore.getState().updateTts("page-a", "tts-1", {
      id: "tts-1",
      provider: "voisona",
      text: "typed",
      readText: "Hello",
      voiceName: "voice",
      padBeforeSec: 0,
      padAfterSec: 0,
      volume: 1,
      speech: {},
    });
    editorStore.getState().updateTts("page-a", "tts-1", {
      id: "tts-1",
      provider: "voisona",
      text: "typed again",
      readText: "Hello",
      voiceName: "voice",
      padBeforeSec: 0,
      padAfterSec: 0,
      volume: 1,
      speech: {},
    });

    expect(editorStore.getState().itemsById["page-a"]).not.toBe(pageABefore);
    expect(pageListStructure.count).toBe(0);
    expect(otherItemType.count).toBe(0);
    expect(otherItemDirty.count).toBe(0);
    expect(editedItemDirty.count).toBe(1);
    expect(otherThumbnail.count).toBe(0);
    expect(editedThumbnail.count).toBe(0);

    pageListStructure.unsubscribe();
    otherItemType.unsubscribe();
    otherItemDirty.unsubscribe();
    editedItemDirty.unsubscribe();
    otherThumbnail.unsubscribe();
    editedThumbnail.unsubscribe();
  });
});

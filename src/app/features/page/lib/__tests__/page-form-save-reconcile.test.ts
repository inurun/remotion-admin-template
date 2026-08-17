import { describe, expect, it } from "vitest";
import { createG2pItem } from "@/_schemas/__tests__/g2p-fixture";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import {
  applyPageFormSavedSpeech,
  createPageFormWatchSync,
  selectPageFormDefaultValues,
} from "@/app/features/page/lib/page-form-sync";
import {
  captureDirtySnapshot,
  hasDirtyChanges,
  selectItemDirtyVersion,
  selectItemReconcileRevision,
  type EditorSessionState,
} from "@/app/features/editor/store/editor-session-state";
import { createEditorSessionStore } from "@/app/features/editor/store/editor-session-store";
import {
  createSavedMainPage,
  createSavedProject,
  createSavedTts,
} from "@/app/features/editor/store/__tests__/fixtures";
import type { SaveProjectResult } from "@/app/features/editor/store/saved-project-state";
import type { SavedProject } from "@/_schemas";

function pageFormTts(id: string, text: string): PageFormValues["tts"][number] {
  return {
    id,
    provider: "voisona",
    text,
    readText: text,
    voiceName: "voice",
    padBeforeSec: 0,
    padAfterSec: 0,
    volume: 1,
    speech: {},
  };
}

function pageFormValues(id: string, title: string, tts: PageFormValues["tts"]): PageFormValues {
  return {
    id,
    title,
    type: "main",
    meta: { tags: [] },
    padBeforeSec: 0,
    padAfterSec: 0,
    richText: "<p>Hello</p>",
    tts,
  };
}

function requirePage(state: Pick<EditorSessionState, "itemsById">, pageId: string) {
  const item = selectPageFormDefaultValues(state, pageId);
  if (!item) {
    throw new Error(`expected page ${pageId}`);
  }
  return item;
}

function createActivePageForm(
  page: PageFormValues,
  upsertPage: (pageId: string, next: PageFormValues) => void,
) {
  let values = page;
  const sync = createPageFormWatchSync(upsertPage);
  const form = {
    getValues: () => values,
    setValue: (name: "tts", next: PageFormValues["tts"]) => {
      values = { ...values, [name]: next };
      sync.sync(page.id, () => form.getValues());
    },
  };
  return { form, sync };
}

function savedProjectWithG2p(
  project: SavedProject,
  g2pByPage: Record<string, Record<string, ReturnType<typeof createG2pItem>>>,
): SavedProject {
  return {
    ...project,
    pages: project.pages.map((item) => {
      if (item.type === "transition") {
        return item;
      }
      const pageG2p = g2pByPage[item.id];
      if (!pageG2p) {
        return item;
      }
      return {
        ...item,
        tts: item.tts.map((tts) => {
          const g2p = pageG2p[tts.id];
          return g2p ? { ...tts, speech: { g2p } } : tts;
        }),
      };
    }),
  };
}

describe("page form save speech reconcile", () => {
  it("reflects saved g2p onto the active page RHF by TTS id", () => {
    const first = createG2pItem("first");
    const second = createG2pItem("second");
    const store = createEditorSessionStore(
      createSavedProject({
        pages: [
          createSavedMainPage({
            id: "page-a",
            title: "A",
            tts: [createSavedTts({ id: "tts-1", text: "One" })],
          }),
          createSavedMainPage({
            id: "page-b",
            title: "B",
            tts: [createSavedTts({ id: "tts-b", text: "B" })],
          }),
        ],
      }),
    );

    store
      .getState()
      .upsertPage(
        "page-a",
        pageFormValues("page-a", "A", [pageFormTts("tts-2", "Two"), pageFormTts("tts-1", "One")]),
      );
    const { form, sync } = createActivePageForm(
      requirePage(store.getState(), "page-a"),
      store.getState().upsertPage,
    );
    const snapshot = captureDirtySnapshot(store.getState());

    const result: SaveProjectResult = {
      project: savedProjectWithG2p(
        createSavedProject({
          pages: [
            createSavedMainPage({
              id: "page-a",
              title: "A",
              tts: [
                createSavedTts({
                  id: "tts-1",
                  text: "One",
                  durationSec: 9,
                  audio: { src: "/tts/one.wav" },
                  speech: { g2p: first },
                }),
                createSavedTts({
                  id: "tts-2",
                  text: "Two",
                  durationSec: 8,
                  audio: { src: "/tts/two.wav" },
                  speech: { g2p: second },
                }),
              ],
            }),
            createSavedMainPage({
              id: "page-b",
              title: "B",
              tts: [createSavedTts({ id: "tts-b", text: "B" })],
            }),
          ],
        }),
        {},
      ),
      updatedItemIds: ["page-a"],
    };

    const upsertsBefore = selectItemDirtyVersion(store.getState(), "page-a");
    store.getState().applySaveSuccess(result, snapshot);
    const sessionPage = requirePage(store.getState(), "page-a");
    sync.applyWithoutSync(() => applyPageFormSavedSpeech(form, sessionPage));
    sync.sync("page-a", () => structuredClone(form.getValues()));

    expect(form.getValues().tts.map((item) => [item.id, item.speech?.g2p])).toEqual([
      ["tts-2", second],
      ["tts-1", first],
    ]);
    expect(form.getValues()).not.toHaveProperty("durationSec");
    expect(form.getValues().tts[0]).not.toHaveProperty("audio");
    expect(sessionPage.tts.map((item) => [item.id, item.speech?.g2p])).toEqual([
      ["tts-2", second],
      ["tts-1", first],
    ]);
    expect(selectItemDirtyVersion(store.getState(), "page-a")).toBe(0);
    expect(selectItemDirtyVersion(store.getState(), "page-a")).not.toBe(upsertsBefore);
    expect(hasDirtyChanges(store.getState())).toBe(false);
  });

  it("keeps in-flight page edits and does not apply the stale save g2p", () => {
    const savedG2p = createG2pItem("saved");
    const store = createEditorSessionStore(createSavedProject());
    store.getState().updateTts("page-1", "tts-1", {
      ...pageFormTts("tts-1", "first"),
    });
    const snapshot = captureDirtySnapshot(store.getState());
    store.getState().updateTts("page-1", "tts-1", {
      ...pageFormTts("tts-1", "during save"),
    });

    const { form, sync } = createActivePageForm(
      requirePage(store.getState(), "page-1"),
      store.getState().upsertPage,
    );
    const pageB = store.getState().itemsById["page-1"];

    store.getState().applySaveSuccess(
      {
        project: savedProjectWithG2p(createSavedProject(), {
          "page-1": { "tts-1": savedG2p },
        }),
        updatedItemIds: ["page-1"],
      },
      snapshot,
    );
    sync.applyWithoutSync(() =>
      applyPageFormSavedSpeech(form, requirePage(store.getState(), "page-1")),
    );

    const page = requirePage(store.getState(), "page-1");
    expect(page.tts[0]?.text).toBe("during save");
    expect(page.tts[0]?.speech?.g2p).toBeUndefined();
    expect(form.getValues().tts[0]?.text).toBe("during save");
    expect(form.getValues().tts[0]?.speech?.g2p).toBeUndefined();
    expect(selectItemDirtyVersion(store.getState(), "page-1")).toBe(2);
    expect(selectItemReconcileRevision(store.getState(), "page-1")).toBe(0);
    expect(store.getState().itemsById["page-1"]).toBe(pageB);
    expect(hasDirtyChanges(store.getState())).toBe(true);
  });

  it("clears matching dirty versions without re-dirtying the page from reconcile", () => {
    const g2p = createG2pItem("analyzed");
    const store = createEditorSessionStore(createSavedProject());
    store
      .getState()
      .upsertPage("page-1", pageFormValues("page-1", "Page 1", [pageFormTts("tts-1", "Hello")]));
    const { form, sync } = createActivePageForm(
      requirePage(store.getState(), "page-1"),
      store.getState().upsertPage,
    );
    const snapshot = captureDirtySnapshot(store.getState());

    store.getState().applySaveSuccess(
      {
        project: savedProjectWithG2p(createSavedProject(), {
          "page-1": { "tts-1": g2p },
        }),
        updatedItemIds: ["page-1"],
      },
      snapshot,
    );
    const dirtyAfterSave = selectItemDirtyVersion(store.getState(), "page-1");
    sync.applyWithoutSync(() =>
      applyPageFormSavedSpeech(form, requirePage(store.getState(), "page-1")),
    );
    sync.sync("page-1", () => structuredClone(form.getValues()));

    expect(dirtyAfterSave).toBe(0);
    expect(selectItemDirtyVersion(store.getState(), "page-1")).toBe(0);
    expect(selectItemReconcileRevision(store.getState(), "page-1")).toBe(1);
    expect(form.getValues().tts[0]?.speech?.g2p).toBe(g2p);
    expect(hasDirtyChanges(store.getState())).toBe(false);
  });

  it("does not notify another page selector when reconciling saved speech", () => {
    const g2p = createG2pItem("analyzed");
    const store = createEditorSessionStore(
      createSavedProject({
        pages: [
          createSavedMainPage({ id: "page-a", title: "A" }),
          createSavedMainPage({
            id: "page-b",
            title: "B",
            tts: [createSavedTts({ id: "tts-b" })],
          }),
        ],
      }),
    );
    store
      .getState()
      .upsertPage("page-a", pageFormValues("page-a", "A", [pageFormTts("tts-1", "Hello")]));
    const snapshot = captureDirtySnapshot(store.getState());
    const pageB = store.getState().itemsById["page-b"];
    const pageBRevision = selectItemReconcileRevision(store.getState(), "page-b");

    let otherPageNotifications = 0;
    let currentOtherPage = store.getState().itemsById["page-b"];
    let currentOtherRevision = pageBRevision;
    const unsubscribe = store.subscribe(() => {
      const nextPage = store.getState().itemsById["page-b"];
      const nextRevision = selectItemReconcileRevision(store.getState(), "page-b");
      if (
        !Object.is(currentOtherPage, nextPage) ||
        !Object.is(currentOtherRevision, nextRevision)
      ) {
        currentOtherPage = nextPage;
        currentOtherRevision = nextRevision;
        otherPageNotifications += 1;
      }
    });

    store.getState().applySaveSuccess(
      {
        project: savedProjectWithG2p(
          createSavedProject({
            pages: [
              createSavedMainPage({
                id: "page-a",
                title: "A",
                tts: [createSavedTts({ speech: { g2p } })],
              }),
              createSavedMainPage({
                id: "page-b",
                title: "B",
                tts: [createSavedTts({ id: "tts-b" })],
              }),
            ],
          }),
          {},
        ),
        updatedItemIds: ["page-a"],
      },
      snapshot,
    );
    unsubscribe();

    expect(store.getState().itemsById["page-b"]).toBe(pageB);
    expect(selectItemReconcileRevision(store.getState(), "page-b")).toBe(pageBRevision);
    expect(selectItemReconcileRevision(store.getState(), "page-a")).toBe(1);
    expect(otherPageNotifications).toBe(0);
  });
});

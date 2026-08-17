import { describe, expect, it } from "vitest";
import {
  applyPageFormSavedSpeech,
  applyPageFormSwitch,
  createIdlePageFormValues,
  createPageFormWatchSync,
  isPageFormScopeReady,
  readPageFormSnapshot,
  resolvePageFormSwitchValues,
  selectPageFormDefaultValues,
  shouldSyncPageFormWatch,
  validatePageFormSnapshot,
} from "@/app/features/page/lib/page-form-sync";
import {
  applyUpsertPage,
  createEditorSessionState,
  hasDirtyChanges,
  selectItemDirtyVersion,
  selectItemType,
  selectSequenceOrder,
} from "@/app/features/editor/store/editor-session-state";
import { createEditorSessionStore } from "@/app/features/editor/store/editor-session-store";
import {
  createSavedMainPage,
  createSavedProject,
  createSavedTts,
} from "@/app/features/editor/store/__tests__/fixtures";
import { validateChangeSet } from "@/app/features/editor/lib/validate-save-change-set";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import { createBlankPageInput } from "@/app/features/page/lib/page-draft";
import { createG2pItem } from "@/_schemas/__tests__/g2p-fixture";

function pageSnapshot(
  overrides: Partial<Extract<PageFormValues, { type: "main" }>> = {},
): PageFormValues {
  return {
    id: "page-1",
    title: "Page 1",
    type: "main",
    meta: { tags: [] },
    padBeforeSec: 0,
    padAfterSec: 0,
    richText: "<p>Hello</p>",
    tts: [
      {
        id: "tts-1",
        provider: "voisona",
        text: "Hello",
        readText: "Hello",
        voiceName: "voice",
        padBeforeSec: 0,
        padAfterSec: 0,
        volume: 1,
        speech: {},
      },
    ],
    ...overrides,
  };
}

describe("page form sync", () => {
  it("reads the current form snapshot without schema parsing", () => {
    const invalid = pageSnapshot({ padBeforeSec: -1 });
    expect(readPageFormSnapshot(() => invalid)).toBe(invalid);
    expect(readPageFormSnapshot(() => invalid).padBeforeSec).toBe(-1);
  });

  it("uses the initialized page snapshot as form default values", () => {
    const state = createEditorSessionState(createSavedProject());
    expect(selectPageFormDefaultValues(state, "page-1")).toBe(state.itemsById["page-1"]);
    expect(selectPageFormDefaultValues(state, "missing")).toBeNull();
  });

  it("does not sync watch snapshots while applying saved speech", () => {
    const calls: PageFormValues[] = [];
    const sync = createPageFormWatchSync((_pageId, page) => {
      calls.push(page);
    });
    let values = pageSnapshot();
    const form = {
      getValues: () => values,
      setValue: (name: "tts", next: PageFormValues["tts"]) => {
        values = { ...values, [name]: next };
        sync.sync("page-1", () => form.getValues());
      },
    };
    const g2pPage = pageSnapshot({
      tts: [
        {
          ...pageSnapshot().tts[0]!,
          speech: { g2p: createG2pItem("analyzed") },
        },
      ],
    });

    sync.applyWithoutSync(() => applyPageFormSavedSpeech(form, g2pPage));

    expect(calls).toEqual([]);
    expect(form.getValues().tts[0]?.speech?.g2p).toEqual(createG2pItem("analyzed"));
  });

  it("ignores a delayed reconcile snapshot watch and syncs a later user snapshot", () => {
    const store = createEditorSessionStore(createSavedProject());
    const calls: PageFormValues[] = [];
    const sync = createPageFormWatchSync((pageId, page) => {
      calls.push(page);
      store.getState().upsertPage(pageId, page);
    });
    let values = pageSnapshot();
    const form = {
      getValues: () => values,
      setValue: (name: "tts", next: PageFormValues["tts"]) => {
        values = { ...values, [name]: next };
      },
    };
    const g2p = createG2pItem("analyzed");
    const g2pPage = pageSnapshot({
      tts: [
        {
          ...pageSnapshot().tts[0]!,
          speech: { g2p },
        },
      ],
    });

    sync.applyWithoutSync(() => applyPageFormSavedSpeech(form, g2pPage));
    expect(calls).toEqual([]);
    expect(selectItemDirtyVersion(store.getState(), "page-1")).toBe(0);

    const delayedEcho = structuredClone(form.getValues());
    sync.sync("page-1", () => delayedEcho);
    expect(calls).toEqual([]);
    expect(selectItemDirtyVersion(store.getState(), "page-1")).toBe(0);
    expect(hasDirtyChanges(store.getState())).toBe(false);

    const userSnapshot = { ...delayedEcho, title: "typed after save" };
    sync.sync("page-1", () => userSnapshot);
    expect(calls).toEqual([userSnapshot]);
    expect(selectItemDirtyVersion(store.getState(), "page-1")).toBe(1);
    expect(store.getState().itemsById["page-1"]).toMatchObject({ title: "typed after save" });
  });

  it("stores form snapshots from the first watch notification without equality checks", () => {
    const calls: PageFormValues[] = [];
    const sync = createPageFormWatchSync((_pageId, page) => {
      calls.push(page);
    });
    const first = pageSnapshot({ title: "first" });
    const second = pageSnapshot({ title: "second" });
    const third = pageSnapshot({ title: "third" });

    sync.sync("page-1", () => first);
    sync.sync("page-1", () => second);
    sync.sync("page-1", () => third);

    expect(calls).toEqual([first, second, third]);
  });

  it("keeps invalid current values until save validation", () => {
    const store = createEditorSessionStore(createSavedProject());
    const current = store.getState().itemsById["page-1"];
    if (!current || current.type === "transition") {
      throw new Error("expected page");
    }

    store.getState().upsertPage("page-1", { ...current, padBeforeSec: -1 });
    expect(store.getState().itemsById["page-1"]).toMatchObject({ padBeforeSec: -1 });
    expect(() =>
      validatePageFormSnapshot(store.getState().itemsById["page-1"] as PageFormValues),
    ).toThrow();
    expect(() =>
      validateChangeSet({
        upsertItems: [{ ...current, padBeforeSec: -1 }],
        removedItemIds: [],
      }),
    ).toThrow();
  });

  it("bumps only the edited page dirty version on first and repeated form snapshots", () => {
    const store = createEditorSessionStore(
      createSavedProject({
        pages: [
          createSavedMainPage({ id: "page-a", title: "A" }),
          createSavedMainPage({ id: "page-b", title: "B", tts: [createSavedTts({ id: "tts-b" })] }),
        ],
      }),
    );
    const pageB = store.getState().itemsById["page-b"];
    const sequence = store.getState().sequenceOrder;
    const current = store.getState().itemsById["page-a"];
    if (!current || current.type === "transition") {
      throw new Error("expected page");
    }

    expect(applyUpsertPage(store.getState(), "page-a", current)).toBe(store.getState());

    store.getState().upsertPage("page-a", { ...current, title: "first" });
    expect(selectItemDirtyVersion(store.getState(), "page-a")).toBe(1);
    store.getState().upsertPage("page-a", { ...current, title: "second" });
    expect(selectItemDirtyVersion(store.getState(), "page-a")).toBe(2);
    expect(selectItemDirtyVersion(store.getState(), "page-b")).toBe(0);
    expect(selectItemType(store.getState(), "page-b")).toBe("main");
    expect(selectSequenceOrder(store.getState())).toBe(sequence);
    expect(store.getState().itemsById["page-b"]).toBe(pageB);
  });

  it("switches the form to the next page without mixing previous values or dirtying", () => {
    const store = createEditorSessionStore(
      createSavedProject({
        pages: [
          createSavedMainPage({ id: "page-a", title: "A" }),
          createSavedMainPage({
            id: "page-b",
            title: "B",
            tts: [createSavedTts({ id: "tts-b", text: "Bee" })],
          }),
        ],
      }),
    );
    const sync = createPageFormWatchSync((pageId, page) => {
      store.getState().upsertPage(pageId, page);
    });
    let values = pageSnapshot({ id: "page-a", title: "A" });
    const form = {
      getValues: () => values,
      reset: (next: PageFormValues) => {
        values = next;
      },
    };
    const nextPage = selectPageFormDefaultValues(store.getState(), "page-b");
    if (!nextPage) {
      throw new Error("expected page-b");
    }

    sync.applyWithoutSync(() => applyPageFormSwitch(form, nextPage));

    expect(form.getValues().id).toBe("page-b");
    expect(form.getValues().title).toBe("B");
    expect(form.getValues().tts[0]?.id).toBe("tts-b");
    expect(hasDirtyChanges(store.getState())).toBe(false);

    sync.sync("page-b", () => structuredClone(form.getValues()));
    expect(hasDirtyChanges(store.getState())).toBe(false);

    sync.sync("page-b", () => pageSnapshot({ id: "page-a", title: "stale A" }));
    expect(store.getState().itemsById["page-b"]).toMatchObject({ title: "B" });
    expect(hasDirtyChanges(store.getState())).toBe(false);

    const userSnapshot = { ...structuredClone(form.getValues()), title: "typed on B" };
    sync.sync("page-b", () => userSnapshot);
    expect(selectItemDirtyVersion(store.getState(), "page-a")).toBe(0);
    expect(selectItemDirtyVersion(store.getState(), "page-b")).toBe(1);
    expect(store.getState().itemsById["page-a"]).toMatchObject({ title: "A" });
    expect(store.getState().itemsById["page-b"]).toMatchObject({ title: "typed on B" });
  });

  it("uses idle form values when the selected item is not a content page", () => {
    const idle = pageSnapshot({ id: "__idle__", title: "" });
    const state = createEditorSessionState(
      createSavedProject({
        pages: [
          createSavedMainPage({ id: "page-a", title: "A" }),
          { id: "tr-1", type: "transition", variant: "slide" },
        ],
      }),
    );

    expect(resolvePageFormSwitchValues(state, "page-a", idle)).toBe(state.itemsById["page-a"]);
    expect(resolvePageFormSwitchValues(state, "tr-1", idle)).toBe(idle);
    expect(resolvePageFormSwitchValues(state, null, idle)).toBe(idle);
  });

  it("keeps form consumers gated until the requested page matches the reset scope", () => {
    expect(isPageFormScopeReady("page-a", "page-a")).toBe(true);
    expect(isPageFormScopeReady("page-b", "page-a")).toBe(false);
    expect(isPageFormScopeReady(null, null)).toBe(true);
    expect(shouldSyncPageFormWatch("page-a", "page-a")).toBe(true);
    expect(shouldSyncPageFormWatch("page-b", "page-a")).toBe(false);
    expect(shouldSyncPageFormWatch(null, "page-a")).toBe(false);
    expect(shouldSyncPageFormWatch(null, null)).toBe(false);
  });

  it("switches between different page types without mixing previous values or dirtying", () => {
    const store = createEditorSessionStore(
      createSavedProject({
        pages: [
          createSavedMainPage({ id: "page-main", title: "Main" }),
          {
            id: "page-endcard",
            title: "End",
            type: "endcard",
            meta: { tags: [], nicoadSource: "", credits: [], advertisers: [], messages: [] },
            padBeforeSec: 0,
            padAfterSec: 0,
            durationSec: 8,
            richText: null,
            tts: [],
          },
          {
            id: "page-outro",
            title: "Outro",
            type: "outro",
            meta: { tags: [], blocks: [] },
            padBeforeSec: 0,
            padAfterSec: 0,
            durationSec: 3,
            richText: null,
            tts: [],
          },
          { id: "tr-1", type: "transition", variant: "slide" },
        ],
      }),
    );
    const sync = createPageFormWatchSync((pageId, page) => {
      store.getState().upsertPage(pageId, page);
    });
    let values: PageFormValues = pageSnapshot({ id: "page-main", title: "Main" });
    const form = {
      getValues: () => values,
      reset: (next: PageFormValues) => {
        values = next;
      },
    };
    const idle = createIdlePageFormValues();

    const endcard = selectPageFormDefaultValues(store.getState(), "page-endcard");
    if (!endcard) {
      throw new Error("expected endcard");
    }
    sync.applyWithoutSync(() => applyPageFormSwitch(form, endcard));
    expect(form.getValues().type).toBe("endcard");
    expect(form.getValues().id).toBe("page-endcard");
    expect(form.getValues().title).toBe("End");
    sync.sync("page-endcard", () => pageSnapshot({ id: "page-main", title: "stale main" }));
    sync.sync("page-endcard", () => structuredClone(form.getValues()));
    expect(hasDirtyChanges(store.getState())).toBe(false);
    expect(store.getState().itemsById["page-main"]).toMatchObject({ title: "Main", type: "main" });

    const outro = selectPageFormDefaultValues(store.getState(), "page-outro");
    if (!outro) {
      throw new Error("expected outro");
    }
    sync.applyWithoutSync(() => applyPageFormSwitch(form, outro));
    expect(form.getValues().type).toBe("outro");
    expect(form.getValues()).toMatchObject({ id: "page-outro", title: "Outro" });
    sync.sync("page-outro", () =>
      createBlankPageInput({ id: "page-endcard", title: "End", type: "endcard" }),
    );
    expect(hasDirtyChanges(store.getState())).toBe(false);

    const next = resolvePageFormSwitchValues(store.getState(), "tr-1", idle);
    sync.applyWithoutSync(() => applyPageFormSwitch(form, next));
    expect(form.getValues()).toEqual(idle);
    sync.sync("tr-1", () => pageSnapshot({ id: "page-main", title: "stale main" }));
    sync.sync("tr-1", () => structuredClone(form.getValues()));
    expect(hasDirtyChanges(store.getState())).toBe(false);
    expect(store.getState().itemsById["tr-1"]).toMatchObject({ type: "transition" });
  });
});

import { describe, expect, it } from "vitest";
import {
  reconstructSavedProject,
  selectPageThumbnailBinding,
  selectPageThumbnailBindingKey,
  shouldMountRemotionThumbnail,
} from "@/app/features/editor/store/saved-project-state";
import { createSavedProjectStore } from "@/app/features/editor/store/saved-project-store";
import {
  applyUpdateTts,
  applyUpsertPage,
  createEditorSessionState,
} from "@/app/features/editor/store/editor-session-state";
import { createSavedMainPage, createSavedProject, createSavedTts } from "./fixtures";

describe("saved project store and thumbnail spike", () => {
  it("keeps thumbnail bindings stable when another page is saved", () => {
    const store = createSavedProjectStore(
      createSavedProject({
        pages: [
          createSavedMainPage({ id: "page-a" }),
          createSavedMainPage({ id: "page-b", tts: [createSavedTts({ id: "tts-b" })] }),
        ],
      }),
    );

    const pageBBefore = selectPageThumbnailBinding(store.getState(), "page-b");
    const pageBKeyBefore = selectPageThumbnailBindingKey(store.getState(), "page-b");
    store.getState().applySaveResult({
      project: reconstructSavedProject(store.getState()),
      updatedItemIds: ["page-a"],
    });

    const pageBAfter = selectPageThumbnailBinding(store.getState(), "page-b");
    expect(pageBAfter.itemRevision).toBe(pageBBefore.itemRevision);
    expect(pageBAfter.renderRevision).toBe(pageBBefore.renderRevision);
    expect(selectPageThumbnailBindingKey(store.getState(), "page-b")).toBe(pageBKeyBefore);
    expect(selectPageThumbnailBinding(store.getState(), "page-a").itemRevision).toBe(
      pageBBefore.itemRevision + 1,
    );
  });

  it("does not change saved thumbnail bindings when editor TTS changes", () => {
    const saved = createSavedProject();
    const store = createSavedProjectStore(saved);
    const before = selectPageThumbnailBinding(store.getState(), "page-1");

    const session = createEditorSessionState(saved);
    const nextSession = applyUpdateTts(session, "page-1", "tts-1", {
      id: "tts-1",
      provider: "voisona",
      text: "typed",
      voiceName: "voice",
      padBeforeSec: 0,
      padAfterSec: 0,
      volume: 1,
      speech: {},
    });

    expect(nextSession.itemsById["page-1"]).not.toBe(session.itemsById["page-1"]);
    expect(selectPageThumbnailBinding(store.getState(), "page-1")).toEqual(before);
  });

  it("does not mount Remotion trees for hidden or unsaved pages", () => {
    expect(shouldMountRemotionThumbnail({ inViewport: false, hasSavedContentPage: true })).toBe(
      false,
    );
    expect(shouldMountRemotionThumbnail({ inViewport: true, hasSavedContentPage: false })).toBe(
      false,
    );
    expect(shouldMountRemotionThumbnail({ inViewport: true, hasSavedContentPage: true })).toBe(
      true,
    );
  });

  it("treats unsaved pages as thumbnail placeholders", () => {
    const store = createSavedProjectStore(createSavedProject());
    expect(selectPageThumbnailBinding(store.getState(), "unsaved-page").hasSavedContentPage).toBe(
      false,
    );
    expect(
      shouldMountRemotionThumbnail({
        inViewport: true,
        hasSavedContentPage: selectPageThumbnailBinding(store.getState(), "unsaved-page")
          .hasSavedContentPage,
      }),
    ).toBe(false);
  });

  it("bumps renderRevision when width, height, or sequence order changes", () => {
    const store = createSavedProjectStore(
      createSavedProject({
        pages: [createSavedMainPage({ id: "page-1" }), createSavedMainPage({ id: "page-2" })],
      }),
    );
    const before = store.getState().renderRevision;
    const project = reconstructSavedProject(store.getState());

    store.getState().applySaveResult({ project, updatedItemIds: ["page-1"] });
    expect(store.getState().renderRevision).toBe(before);

    store.getState().applySaveResult({
      project: {
        ...project,
        pages: [...project.pages].reverse(),
      },
      updatedItemIds: [],
    });
    expect(store.getState().renderRevision).toBe(before + 1);

    store.getState().applySaveResult({
      project: {
        ...project,
        pages: [...project.pages].reverse(),
        meta: { ...project.meta, width: 1080, height: 1920 },
      },
      updatedItemIds: [],
    });
    expect(store.getState().renderRevision).toBe(before + 2);
  });

  it("invalidates later thumbnails when an earlier saved page duration changes", () => {
    const store = createSavedProjectStore(
      createSavedProject({
        pages: [
          createSavedMainPage({ id: "page-a", durationSec: 1 }),
          createSavedMainPage({ id: "page-b", durationSec: 1 }),
        ],
      }),
    );
    const pageBBefore = selectPageThumbnailBindingKey(store.getState(), "page-b");
    const project = reconstructSavedProject(store.getState());

    store.getState().applySaveResult({
      project: {
        ...project,
        pages: project.pages.map((page) =>
          page.id === "page-a" && page.type !== "transition" ? { ...page, durationSec: 4 } : page,
        ),
      },
      updatedItemIds: ["page-a"],
    });

    expect(selectPageThumbnailBindingKey(store.getState(), "page-b")).not.toBe(pageBBefore);
    expect(store.getState().renderRevision).toBe(1);
    expect(store.getState().itemRevision["page-a"]).toBe(1);
    expect(store.getState().itemRevision["page-b"]).toBe(0);
  });

  it("does not invalidate later thumbnails for unrelated non-timing draft edits", () => {
    const saved = createSavedProject({
      pages: [
        createSavedMainPage({ id: "page-a", durationSec: 1 }),
        createSavedMainPage({ id: "page-b", durationSec: 1 }),
      ],
    });
    const store = createSavedProjectStore(saved);
    const pageBBefore = selectPageThumbnailBindingKey(store.getState(), "page-b");
    const session = createEditorSessionState(saved);
    const pageA = session.itemsById["page-a"];
    if (!pageA || pageA.type === "transition") {
      throw new Error("expected page");
    }

    const next = applyUpsertPage(session, "page-a", { ...pageA, title: "typed" });
    expect(next.itemsById["page-a"]).not.toBe(session.itemsById["page-a"]);
    expect(selectPageThumbnailBindingKey(store.getState(), "page-b")).toBe(pageBBefore);
    expect(store.getState().renderRevision).toBe(0);
  });
});

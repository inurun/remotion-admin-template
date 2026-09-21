import { describe, expect, it } from "vitest";
import { EMPTY_TIMELINE } from "@/_schemas";
import {
  reconstructSavedProject,
  selectFailedTtsItemIds,
} from "@/app/features/editor/store/saved-project-state";
import { createSavedProjectStore } from "@/app/features/editor/store/saved-project-store";
import {
  applyUpdateTts,
  applyUpsertPage,
  createEditorSessionState,
} from "@/app/features/editor/store/editor-session-state";
import { createSavedMainPage, createSavedProject, createSavedTts } from "./fixtures";

describe("saved project store revisions", () => {
  it("keeps other item revisions stable when another page is saved", () => {
    const store = createSavedProjectStore(
      createSavedProject({
        pages: [
          createSavedMainPage({ id: "page-a" }),
          createSavedMainPage({ id: "page-b", tts: [createSavedTts({ id: "tts-b" })] }),
        ],
      }),
    );

    const pageBItemRevision = store.getState().itemRevision["page-b"];
    const renderRevision = store.getState().renderRevision;
    store.getState().applySaveResult({
      project: reconstructSavedProject(store.getState()),
      timeline: EMPTY_TIMELINE,
      updatedItemIds: ["page-a"],
    });

    expect(store.getState().itemRevision["page-b"]).toBe(pageBItemRevision);
    expect(store.getState().renderRevision).toBe(renderRevision);
    expect(store.getState().itemRevision["page-a"]).toBe((pageBItemRevision ?? 0) + 1);
  });

  it("does not change saved revisions when editor TTS changes", () => {
    const saved = createSavedProject();
    const store = createSavedProjectStore(saved);
    const before = {
      itemRevision: store.getState().itemRevision["page-1"],
      renderRevision: store.getState().renderRevision,
    };

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
    expect(store.getState().itemRevision["page-1"]).toBe(before.itemRevision);
    expect(store.getState().renderRevision).toBe(before.renderRevision);
  });

  it("bumps renderRevision when width, height, or sequence order changes", () => {
    const store = createSavedProjectStore(
      createSavedProject({
        pages: [createSavedMainPage({ id: "page-1" }), createSavedMainPage({ id: "page-2" })],
      }),
    );
    const before = store.getState().renderRevision;
    const project = reconstructSavedProject(store.getState());

    store
      .getState()
      .applySaveResult({ project, timeline: EMPTY_TIMELINE, updatedItemIds: ["page-1"] });
    expect(store.getState().renderRevision).toBe(before);

    store.getState().applySaveResult({
      project: {
        ...project,
        pages: [...project.pages].reverse(),
      },
      timeline: EMPTY_TIMELINE,
      updatedItemIds: [],
    });
    expect(store.getState().renderRevision).toBe(before + 1);

    store.getState().applySaveResult({
      project: {
        ...project,
        pages: [...project.pages].reverse(),
        meta: { ...project.meta, width: 1080, height: 1920 },
      },
      timeline: EMPTY_TIMELINE,
      updatedItemIds: [],
    });
    expect(store.getState().renderRevision).toBe(before + 2);
  });

  it("bumps renderRevision when an earlier saved page duration changes", () => {
    const initialTimeline = {
      durationSec: 2,
      tracks: [
        {
          id: "sequence",
          clips: [
            { id: "page-a", startSec: 0, durationSec: 1, clips: [] },
            { id: "page-b", startSec: 1, durationSec: 1, clips: [] },
          ],
        },
      ],
    };
    const store = createSavedProjectStore(
      createSavedProject({
        pages: [createSavedMainPage({ id: "page-a" }), createSavedMainPage({ id: "page-b" })],
      }),
      initialTimeline,
    );
    const renderRevisionBefore = store.getState().renderRevision;
    const project = reconstructSavedProject(store.getState());

    store.getState().applySaveResult({
      project,
      timeline: {
        durationSec: 5,
        tracks: [
          {
            id: "sequence",
            clips: [
              { id: "page-a", startSec: 0, durationSec: 4, clips: [] },
              { id: "page-b", startSec: 4, durationSec: 1, clips: [] },
            ],
          },
        ],
      },
      updatedItemIds: ["page-a"],
    });

    expect(store.getState().renderRevision).not.toBe(renderRevisionBefore);
    expect(store.getState().renderRevision).toBe(1);
    expect(store.getState().itemRevision["page-a"]).toBe(1);
    expect(store.getState().itemRevision["page-b"]).toBe(0);
  });

  it("does not bump saved revisions for unrelated non-timing draft edits", () => {
    const saved = createSavedProject({
      pages: [createSavedMainPage({ id: "page-a" }), createSavedMainPage({ id: "page-b" })],
    });
    const store = createSavedProjectStore(saved);
    const pageBItemRevision = store.getState().itemRevision["page-b"];
    const session = createEditorSessionState(saved);
    const pageA = session.itemsById["page-a"];
    if (!pageA || pageA.type === "transition") {
      throw new Error("expected page");
    }

    const next = applyUpsertPage(session, "page-a", { ...pageA, title: "typed" });
    expect(next.itemsById["page-a"]).not.toBe(session.itemsById["page-a"]);
    expect(store.getState().itemRevision["page-b"]).toBe(pageBItemRevision);
    expect(store.getState().renderRevision).toBe(0);
  });

  it("applies external synthesis updates without resetting revisions", () => {
    const store = createSavedProjectStore(
      createSavedProject({
        pages: [
          createSavedMainPage({
            id: "page-a",
            tts: [createSavedTts({ audio: { status: "pending", src: "/tts/a.wav" } })],
          }),
          createSavedMainPage({ id: "page-b" }),
        ],
      }),
    );
    const pageBItemRevision = store.getState().itemRevision["page-b"];

    store.getState().applyExternalProject(
      createSavedProject({
        pages: [
          createSavedMainPage({
            id: "page-a",
            tts: [
              createSavedTts({
                audio: { status: "ready", src: "/tts/a.wav", durationSec: 2 },
              }),
            ],
          }),
          createSavedMainPage({ id: "page-b" }),
        ],
      }),
    );

    expect(store.getState().itemRevision["page-a"]).toBe(1);
    expect(store.getState().itemRevision["page-b"]).toBe(pageBItemRevision);
    expect(store.getState().renderRevision).toBe(1);
  });

  it("does not bump preview revisions from analyzing to pending", () => {
    const store = createSavedProjectStore(
      createSavedProject({
        pages: [
          createSavedMainPage({
            tts: [createSavedTts({ audio: { status: "analyzing", analysisKey: "key-1" } })],
          }),
        ],
      }),
    );

    store.getState().applyExternalProject(
      createSavedProject({
        pages: [
          createSavedMainPage({
            tts: [createSavedTts({ audio: { status: "pending", src: "/tts/a.wav" } })],
          }),
        ],
      }),
    );

    expect(store.getState().itemRevision["page-1"]).toBe(0);
    expect(store.getState().renderRevision).toBe(0);
  });

  it("increments syncGeneration for save and external updates", () => {
    const store = createSavedProjectStore(createSavedProject());
    expect(store.getState().syncGeneration).toBe(0);

    store.getState().applySaveResult({
      project: reconstructSavedProject(store.getState()),
      timeline: EMPTY_TIMELINE,
      updatedItemIds: [],
    });
    expect(store.getState().syncGeneration).toBe(1);

    store.getState().applyExternalProject(reconstructSavedProject(store.getState()));
    expect(store.getState().syncGeneration).toBe(2);
  });

  it("collects pages that still have failed tts", () => {
    const store = createSavedProjectStore(
      createSavedProject({
        pages: [
          createSavedMainPage({ id: "page-ready" }),
          createSavedMainPage({
            id: "page-failed",
            tts: [
              createSavedTts({
                id: "tts-failed",
                audio: { status: "failed", src: "/tts/a.wav", error: "timed out" },
              }),
            ],
          }),
        ],
      }),
    );

    expect(selectFailedTtsItemIds(store.getState())).toEqual(["page-failed"]);
  });
});

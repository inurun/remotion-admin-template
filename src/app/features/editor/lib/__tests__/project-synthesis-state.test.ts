import { describe, expect, it } from "vitest";
import { createSavedProjectState } from "@/app/features/editor/store/saved-project-state";
import {
  collectPendingToFailedToasts,
  resolveSynthesisPollUpdate,
} from "@/app/features/editor/lib/project-synthesis-state";
import {
  createSavedMainPage,
  createSavedProject,
  createSavedTts,
} from "@/app/features/editor/store/__tests__/fixtures";

describe("project synthesis toasts", () => {
  it("notifies pending to failed once", () => {
    const previous = createSavedProjectState(
      createSavedProject({
        pages: [
          createSavedMainPage({
            tts: [
              createSavedTts({
                id: "tts-1",
                text: "Hello there",
                audio: { status: "pending", src: "/tts/a.wav" },
              }),
            ],
          }),
        ],
      }),
    );
    const next = createSavedProject({
      pages: [
        createSavedMainPage({
          tts: [
            createSavedTts({
              id: "tts-1",
              text: "Hello there",
              audio: { status: "failed", src: "/tts/a.wav", error: "engine failed" },
            }),
          ],
        }),
      ],
    });

    expect(collectPendingToFailedToasts(previous, next)).toEqual([
      { id: "tts-1", message: "音声合成に失敗: Hello there — engine failed" },
    ]);
  });

  it("does not notify tts that were already failed", () => {
    const project = createSavedProject({
      pages: [
        createSavedMainPage({
          tts: [
            createSavedTts({
              id: "tts-1",
              audio: { status: "failed", src: "/tts/a.wav", error: "engine failed" },
            }),
          ],
        }),
      ],
    });

    expect(collectPendingToFailedToasts(createSavedProjectState(project), project)).toEqual([]);
  });

  it("discards a poll that started before a newer store write", () => {
    const pending = createSavedProject({
      pages: [
        createSavedMainPage({
          tts: [createSavedTts({ audio: { status: "pending", src: "/tts/new.wav" } })],
        }),
      ],
    });
    const staleReady = createSavedProject({
      pages: [
        createSavedMainPage({
          tts: [
            createSavedTts({
              audio: { status: "ready", src: "/tts/old.wav", durationSec: 1 },
            }),
          ],
        }),
      ],
    });
    const current = createSavedProjectState(pending, 2);

    expect(
      resolveSynthesisPollUpdate({
        startedSyncGeneration: 1,
        current,
        project: staleReady,
      }),
    ).toEqual({ apply: false });
    expect(
      resolveSynthesisPollUpdate({
        startedSyncGeneration: 2,
        current,
        project: pending,
      }),
    ).toEqual({ apply: true, failedToasts: [] });
  });
});

import type { SavedProject } from "@/_schemas";
import type { SavedProjectState } from "@/app/features/editor/store/saved-project-state";

const TOAST_TEXT_MAX_LENGTH = 40;
const TOAST_ERROR_MAX_LENGTH = 80;

function truncateLabel(value: string, maxLength: number) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}

export function collectPendingToFailedToasts(previous: SavedProjectState, project: SavedProject) {
  const previousTts = new Map(
    Object.values(previous.itemsById).flatMap((item) => {
      if (item.type === "transition") {
        return [];
      }
      return item.tts.map((tts) => [tts.id, tts] as const);
    }),
  );

  return project.pages.flatMap((page) => {
    if (page.type === "transition") {
      return [];
    }

    return page.tts.flatMap((tts) => {
      if (tts.audio.status !== "failed") {
        return [];
      }
      const previousItem = previousTts.get(tts.id);
      if (!previousItem || previousItem.audio.status !== "pending") {
        return [];
      }
      return [
        {
          id: tts.id,
          message: `音声合成に失敗: ${truncateLabel(tts.text, TOAST_TEXT_MAX_LENGTH)} — ${truncateLabel(tts.audio.error, TOAST_ERROR_MAX_LENGTH)}`,
        },
      ];
    });
  });
}

export function resolveSynthesisPollUpdate(input: {
  startedSyncGeneration: number;
  current: SavedProjectState;
  project: SavedProject;
}) {
  if (input.current.syncGeneration !== input.startedSyncGeneration) {
    return { apply: false as const };
  }

  return {
    apply: true as const,
    failedToasts: collectPendingToFailedToasts(input.current, input.project),
  };
}

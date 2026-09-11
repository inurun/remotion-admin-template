import {
  isSavedContentPage,
  type SavedProject,
  type SavedTts,
  type SavedTtsAudio,
} from "@/_schemas";
import type { TtsTimingInput } from "@/_shared/lib/tts/tts-timing";

export function isReadyTtsAudio(
  audio: SavedTtsAudio,
): audio is Extract<SavedTtsAudio, { status: "ready" }> {
  return audio.status === "ready";
}

export function isAnalyzingTtsAudio(
  audio: SavedTtsAudio,
): audio is Extract<SavedTtsAudio, { status: "analyzing" }> {
  return audio.status === "analyzing";
}

export function isPendingTtsAudio(
  audio: SavedTtsAudio,
): audio is Extract<SavedTtsAudio, { status: "pending" }> {
  return audio.status === "pending";
}

export function isFailedTtsAudio(
  audio: SavedTtsAudio,
): audio is Extract<SavedTtsAudio, { status: "failed" }> {
  return audio.status === "failed";
}

export function isUnresolvedTtsAudio(
  audio: SavedTtsAudio,
): audio is Extract<SavedTtsAudio, { status: "analyzing" | "pending" }> {
  return audio.status === "analyzing" || audio.status === "pending";
}

export function isPlayableTtsAudio(
  audio: SavedTtsAudio,
): audio is Extract<SavedTtsAudio, { status: "ready" }> {
  return audio.status === "ready" && audio.src.trim() !== "";
}

export function isPlayableTts(
  item: SavedTts,
): item is SavedTts & { audio: Extract<SavedTtsAudio, { status: "ready" }> } {
  return isPlayableTtsAudio(item.audio);
}

export function getReadyTtsTimingInput(item: SavedTts): TtsTimingInput | null {
  if (!isPlayableTtsAudio(item.audio)) {
    return null;
  }

  return {
    durationSec: item.audio.durationSec,
    padBeforeSec: item.padBeforeSec,
    padAfterSec: item.padAfterSec,
  };
}

export function listReadyTtsTimingInputs(items: readonly SavedTts[]): TtsTimingInput[] {
  return items.flatMap((item) => {
    const timing = getReadyTtsTimingInput(item);
    return timing ? [timing] : [];
  });
}

export function contentPageHasPendingTts(item: { tts: readonly SavedTts[] }) {
  return item.tts.some((tts) => tts.audio.status === "pending");
}

export function contentPageHasUnresolvedAudio(item: { tts: readonly SavedTts[] }) {
  return item.tts.some((tts) => isUnresolvedTtsAudio(tts.audio));
}

export function contentPageHasUnresolvedTts(item: { tts: readonly SavedTts[] }) {
  return item.tts.some((tts) => isUnresolvedTtsAudio(tts.audio) || tts.audio.status === "failed");
}

export function projectHasPendingTts(project: Pick<SavedProject, "pages">) {
  return project.pages.some((page) => isSavedContentPage(page) && contentPageHasPendingTts(page));
}

export function projectHasUnresolvedAudio(project: Pick<SavedProject, "pages">) {
  return project.pages.some(
    (page) => isSavedContentPage(page) && contentPageHasUnresolvedAudio(page),
  );
}

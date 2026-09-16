import type { SavedPage, SavedTts } from "@/_schemas";

export function listSavedPageTtsInPlaybackOrder(page: SavedPage): SavedTts[] {
  if (page.type !== "comments") {
    return page.tts;
  }

  const ttsById = new Map(page.tts.map((item) => [item.id, item]));
  return page.commentGroups.flatMap((group) =>
    group.ttsIds.flatMap((id) => {
      const item = ttsById.get(id);
      return item ? [item] : [];
    }),
  );
}

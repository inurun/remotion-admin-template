import type { SavedPage, SavedTts } from "@/_schemas";
import { listCommentGroupPlaybackTts } from "@/server/features/project/comments-presentation";

export function listSavedPageTtsInPlaybackOrder(page: SavedPage): SavedTts[] {
  if (page.type !== "comments") {
    return page.tts;
  }

  return listCommentGroupPlaybackTts(
    page.commentGroups,
    page.commentScenes,
    page.tts,
    page.meta.presentation,
  );
}

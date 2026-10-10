import type { SavedCommentsPage } from "@/_schemas";
import { getPageClip } from "@/video-host/sequence-clips";
import { useTimeline } from "@/video/core/context";
import { usePageTtsSegments } from "@/video/pages/use-page-tts-segments";

export function useCommentsPage(page: SavedCommentsPage) {
  const timeline = useTimeline();
  const { ttsSegments } = usePageTtsSegments(page);
  const commentsById = new Map(page.comments.map((comment) => [comment.id, comment]));
  const groupsById = new Map(
    page.commentGroups.map((group) => [
      group.id,
      {
        group,
        comments: group.commentIds.flatMap((id) => {
          const comment = commentsById.get(id);
          return comment ? [comment] : [];
        }),
      },
    ]),
  );

  // Group clips are contiguous from the page start: each group shows until the next one
  // starts, the first one from the page start and the last one to the page end (seconds,
  // page-relative; an undefined duration runs to the end of the page).
  const groupClips = (getPageClip(timeline, page.id)?.clips ?? []).flatMap((clip) => {
    const group = groupsById.get(clip.id);
    return group ? [{ ...group, startSec: clip.startSec }] : [];
  });
  const groupRanges = groupClips.flatMap((item, index) => {
    const startSec = index === 0 ? 0 : item.startSec;
    const next = groupClips[index + 1];
    const durationSec = next ? next.startSec - startSec : undefined;
    return durationSec === undefined || durationSec > 0 ? [{ ...item, startSec, durationSec }] : [];
  });

  return { ttsSegments, groupRanges };
}

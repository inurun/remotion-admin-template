import { useVideoConfig } from "@inurun/vite-plugin-hyperframes-jsx/runtime";
import type { SavedCommentsPage } from "@/_schemas";
import { secondsToFrames } from "@/video-host/frame-utils";
import { getPageClip } from "@/video-host/sequence-clips";
import { useTimeline } from "@/video/core/context";
import { usePageTtsSegments } from "@/video/pages/use-page-tts-segments";

export function useCommentsPage(page: SavedCommentsPage) {
  const { fps } = useVideoConfig();
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
  // starts, the first one from frame 0 and the last one to the page end.
  const groupClips = (getPageClip(timeline, page.id)?.clips ?? []).flatMap((clip) => {
    const group = groupsById.get(clip.id);
    return group ? [{ ...group, start: secondsToFrames(clip.startSec, fps) }] : [];
  });
  const groupRanges = groupClips.map((item, index) => {
    const from = index === 0 ? 0 : item.start;
    const next = groupClips[index + 1];
    return { ...item, from, durationInFrames: next ? next.start - from : undefined };
  });

  return { ttsSegments, groupRanges };
}

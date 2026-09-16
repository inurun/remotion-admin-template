import { useCurrentFrame, useVideoConfig } from "remotion";
import { SEQUENCE_TRACK_ID, type SavedCommentsPage } from "@/_schemas";
import { secondsToFrames } from "@/remotion/utils/timing";
import { useTimeline } from "@/remotion/core/context";
import { usePageTtsSegments } from "@/remotion/pages/use-page-tts-segments";

export function useCommentsPage(page: SavedCommentsPage) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeline = useTimeline();
  const { ttsSegments } = usePageTtsSegments(page);
  const commentsById = new Map(page.comments.map((comment) => [comment.id, comment]));
  const groups = page.commentGroups.map((group) => ({
    group,
    comments: group.commentIds.flatMap((id) => {
      const comment = commentsById.get(id);
      return comment ? [comment] : [];
    }),
  }));
  const groupsById = new Map(groups.map((item) => [item.group.id, item]));

  const pageClip = (
    timeline.tracks.find((track) => track.id === SEQUENCE_TRACK_ID)?.clips ?? []
  ).find((clip) => clip.id === page.id);
  const groupClips = (pageClip?.clips ?? []).filter((clip) => groupsById.has(clip.id));
  const visibleGroups = groupClips.flatMap((clip) => {
    const group = groupsById.get(clip.id);
    return group ? [group] : [];
  });
  const currentClip = groupClips.find((clip) => {
    const start = secondsToFrames(clip.startSec, fps);
    const end = start + secondsToFrames(clip.durationSec, fps);
    return frame >= start && frame < end;
  });
  const currentGroup = currentClip
    ? groupsById.get(currentClip.id)
    : frame < secondsToFrames(groupClips[0]?.startSec ?? 0, fps)
      ? visibleGroups[0]
      : visibleGroups.at(-1);

  const speaking = ttsSegments.find(
    (segment) => frame >= segment.start && frame < segment.start + segment.duration,
  );

  return { ttsSegments, currentGroup, speaking };
}

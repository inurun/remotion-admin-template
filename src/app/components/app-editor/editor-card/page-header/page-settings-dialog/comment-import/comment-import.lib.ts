import type { NiconicoComment } from "@/_schemas/project/comments";

export function formatVposMs(vposMs: number) {
  const totalSec = Math.floor(vposMs / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function overlayCommentHidden(
  comments: readonly NiconicoComment[],
  overlays: ReadonlyArray<Iterable<Pick<NiconicoComment, "id" | "hidden">>>,
): NiconicoComment[] {
  const hiddenById = new Map<string, boolean>();
  for (const overlay of overlays) {
    for (const comment of overlay) {
      hiddenById.set(comment.id, comment.hidden);
    }
  }
  return comments.map((comment) => ({
    ...comment,
    hidden: hiddenById.get(comment.id) ?? false,
  }));
}

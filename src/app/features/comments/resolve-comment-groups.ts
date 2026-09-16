import type { CommentGroup, NiconicoComment } from "@/_schemas/project/comments";

export type CommentPageLookup = {
  comments: NiconicoComment[];
  commentGroups: CommentGroup[];
};

export type ResolvedCommentGroup<Tts extends { id: string }> = {
  group: CommentGroup;
  comments: NiconicoComment[];
  replies: Tts[];
};

export function commentGroupDisplayText(
  group: Pick<CommentGroup, "displayText" | "commentIds">,
  commentsById: ReadonlyMap<string, Pick<NiconicoComment, "body">>,
) {
  if (group.displayText !== null) {
    return group.displayText;
  }
  return commentsById.get(group.commentIds[0] ?? "")?.body ?? "";
}

export function resolveCommentGroups<Tts extends { id: string }>(
  page: CommentPageLookup & { tts: Tts[] },
): Array<ResolvedCommentGroup<Tts>> {
  const commentsById = new Map(page.comments.map((comment) => [comment.id, comment]));
  const ttsById = new Map(page.tts.map((item) => [item.id, item]));

  return page.commentGroups.map((group) => ({
    group,
    comments: group.commentIds.flatMap((commentId) => {
      const comment = commentsById.get(commentId);
      return comment ? [comment] : [];
    }),
    replies: group.ttsIds.flatMap((ttsId) => {
      const item = ttsById.get(ttsId);
      return item ? [item] : [];
    }),
  }));
}

export function listPageTtsInPlaybackOrder<Tts extends { id: string }>(
  page: { type: string; tts: Tts[] } & Partial<CommentPageLookup>,
): Tts[] {
  if (page.type !== "comments" || !page.commentGroups || !page.comments) {
    return page.tts;
  }

  return resolveCommentGroups({
    comments: page.comments,
    commentGroups: page.commentGroups,
    tts: page.tts,
  }).flatMap((resolved) => resolved.replies);
}

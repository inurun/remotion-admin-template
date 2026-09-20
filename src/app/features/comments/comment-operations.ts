import { type CommentGroup, type NiconicoComment } from "@/_schemas/project/comments";
import type { CommentsPageFormValues } from "@/app/features/page/model/page-form-schema";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import { createTtsInput } from "@/app/features/tts";
import type { VoiceOption } from "@/_schemas";

function cloneTts(item: TtsFormValues): TtsFormValues {
  return {
    ...item,
    speech: item.speech ? { ...item.speech } : {},
  };
}

export function cloneCommentsPage(page: CommentsPageFormValues): CommentsPageFormValues {
  return {
    ...page,
    meta: {
      tags: [...page.meta.tags],
      niconico: page.meta.niconico ? { ...page.meta.niconico } : null,
    },
    comments: page.comments.map((comment) => ({ ...comment })),
    commentGroups: page.commentGroups.map((group) => ({
      ...group,
      commentIds: [...group.commentIds],
      ttsIds: [...group.ttsIds],
    })),
    tts: page.tts.map(cloneTts),
  };
}

export function commentsStructureKey(page: CommentsPageFormValues) {
  return JSON.stringify(
    page.commentGroups.map((group) => ({
      id: group.id,
      commentIds: group.commentIds,
      ttsIds: group.ttsIds,
    })),
  );
}

export function commentsEditFingerprint(page: CommentsPageFormValues) {
  return JSON.stringify({
    title: page.title,
    tags: page.meta.tags,
    niconico: page.meta.niconico,
    comments: page.comments,
    commentGroups: page.commentGroups,
    tts: page.tts.map(({ speech: _speech, ...rest }) => rest),
  });
}

export function insertedCommentIds(page: Pick<CommentsPageFormValues, "commentGroups">) {
  return new Set(page.commentGroups.flatMap((group) => group.commentIds));
}

function findGroupIndexByComment(page: CommentsPageFormValues, commentId: string) {
  return page.commentGroups.findIndex((group) => group.commentIds.includes(commentId));
}

function findGroupIndexByReply(page: CommentsPageFormValues, ttsId: string) {
  return page.commentGroups.findIndex((group) => group.ttsIds.includes(ttsId));
}

function dropTts(page: CommentsPageFormValues, ids: Iterable<string>) {
  const remove = new Set(ids);
  page.tts = page.tts.filter((item) => !remove.has(item.id));
}

function createGroup(commentIds: string[]): CommentGroup {
  return {
    id: crypto.randomUUID(),
    commentIds,
    displayText: null,
    ttsIds: [],
  };
}

export function mergeCommentSnapshot(
  page: CommentsPageFormValues,
  comments: readonly NiconicoComment[],
): CommentsPageFormValues {
  const next = cloneCommentsPage(page);
  const byId = new Map(next.comments.map((comment) => [comment.id, comment]));
  for (const comment of comments) {
    const existing = byId.get(comment.id);
    if (!existing) {
      const copy = { ...comment };
      byId.set(copy.id, copy);
      next.comments.push(copy);
      continue;
    }
    existing.hidden = comment.hidden;
  }
  return next;
}

export function insertCommentsAsGroups(
  page: CommentsPageFormValues,
  commentIds: readonly string[],
): CommentsPageFormValues {
  const next = cloneCommentsPage(page);
  const known = new Map(next.comments.map((comment) => [comment.id, comment]));
  const inserted = insertedCommentIds(next);
  for (const commentId of commentIds) {
    const comment = known.get(commentId);
    if (inserted.has(commentId) || !comment || comment.hidden) {
      continue;
    }
    next.commentGroups.push(createGroup([commentId]));
    inserted.add(commentId);
  }
  return next;
}

function removeGroupAt(page: CommentsPageFormValues, index: number) {
  const group = page.commentGroups[index];
  if (!group) {
    return;
  }
  dropTts(page, group.ttsIds);
  page.commentGroups.splice(index, 1);
}

export function moveGroup(
  page: CommentsPageFormValues,
  groupId: string,
  toIndex: number,
): CommentsPageFormValues {
  const fromIndex = page.commentGroups.findIndex((group) => group.id === groupId);
  if (fromIndex < 0) {
    return page;
  }
  const bounded = Math.max(0, Math.min(toIndex, page.commentGroups.length - 1));
  if (fromIndex === bounded) {
    return page;
  }
  const next = cloneCommentsPage(page);
  const [group] = next.commentGroups.splice(fromIndex, 1);
  if (!group) {
    return page;
  }
  next.commentGroups.splice(bounded, 0, group);
  return next;
}

export function mergeGroupInto(
  page: CommentsPageFormValues,
  sourceId: string,
  targetId: string,
): CommentsPageFormValues {
  if (sourceId === targetId) {
    return page;
  }
  const sourceIndex = page.commentGroups.findIndex((group) => group.id === sourceId);
  const targetIndex = page.commentGroups.findIndex((group) => group.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) {
    return page;
  }
  const next = cloneCommentsPage(page);
  const source = next.commentGroups[sourceIndex];
  const target = next.commentGroups[targetIndex];
  if (!source || !target) {
    return page;
  }
  target.commentIds.push(...source.commentIds);
  target.ttsIds.push(...source.ttsIds);
  next.commentGroups.splice(sourceIndex, 1);
  return next;
}

export function moveComment(
  page: CommentsPageFormValues,
  commentId: string,
  targetGroupId: string,
  index: number,
): CommentsPageFormValues {
  const sourceIndex = findGroupIndexByComment(page, commentId);
  const targetIndex = page.commentGroups.findIndex((group) => group.id === targetGroupId);
  if (sourceIndex < 0 || targetIndex < 0) {
    return page;
  }
  const source = page.commentGroups[sourceIndex];
  if (!source) {
    return page;
  }
  if (source.commentIds.length === 1 && source.id !== targetGroupId) {
    const next = cloneCommentsPage(page);
    const liveSourceIndex = next.commentGroups.findIndex((group) => group.id === source.id);
    const liveTarget = next.commentGroups.find((group) => group.id === targetGroupId);
    const liveSource = liveSourceIndex >= 0 ? next.commentGroups[liveSourceIndex] : undefined;
    if (!liveSource || !liveTarget) {
      return page;
    }
    const insertAt = Math.max(0, Math.min(index, liveTarget.commentIds.length));
    liveTarget.commentIds.splice(insertAt, 0, ...liveSource.commentIds);
    liveTarget.ttsIds.push(...liveSource.ttsIds);
    next.commentGroups.splice(liveSourceIndex, 1);
    return next;
  }

  if (source.id === targetGroupId) {
    const from = source.commentIds.indexOf(commentId);
    if (from < 0) {
      return page;
    }
    let to = Math.max(0, Math.min(index, source.commentIds.length - 1));
    if (from === to) {
      return page;
    }
    const next = cloneCommentsPage(page);
    const group = next.commentGroups[sourceIndex];
    if (!group) {
      return page;
    }
    const [moved] = group.commentIds.splice(from, 1);
    if (!moved) {
      return page;
    }
    if (from < to) {
      to -= 1;
    }
    group.commentIds.splice(to, 0, moved);
    return next;
  }

  const next = cloneCommentsPage(page);
  const fromGroup = next.commentGroups[sourceIndex];
  const toGroup = next.commentGroups.find((group) => group.id === targetGroupId);
  if (!fromGroup || !toGroup) {
    return page;
  }
  fromGroup.commentIds = fromGroup.commentIds.filter((id) => id !== commentId);
  const insertAt = Math.max(0, Math.min(index, toGroup.commentIds.length));
  toGroup.commentIds.splice(insertAt, 0, commentId);
  return next;
}

export function detachComment(
  page: CommentsPageFormValues,
  commentId: string,
  insertIndex: number,
): CommentsPageFormValues {
  const sourceIndex = findGroupIndexByComment(page, commentId);
  if (sourceIndex < 0) {
    return page;
  }
  const source = page.commentGroups[sourceIndex];
  if (!source) {
    return page;
  }
  if (source.commentIds.length === 1) {
    return moveGroup(page, source.id, insertIndex);
  }

  const next = cloneCommentsPage(page);
  const fromGroup = next.commentGroups[sourceIndex];
  if (!fromGroup) {
    return page;
  }
  fromGroup.commentIds = fromGroup.commentIds.filter((id) => id !== commentId);
  const group = createGroup([commentId]);
  const bounded = Math.max(0, Math.min(insertIndex, next.commentGroups.length));
  next.commentGroups.splice(bounded, 0, group);
  return next;
}

export function moveReply(
  page: CommentsPageFormValues,
  ttsId: string,
  targetGroupId: string,
  index: number,
): CommentsPageFormValues {
  const sourceIndex = findGroupIndexByReply(page, ttsId);
  const targetIndex = page.commentGroups.findIndex((group) => group.id === targetGroupId);
  if (sourceIndex < 0 || targetIndex < 0) {
    return page;
  }
  const fromGroup = page.commentGroups[sourceIndex];
  const toGroup = page.commentGroups[targetIndex];
  if (!fromGroup || !toGroup) {
    return page;
  }
  const from = fromGroup.ttsIds.indexOf(ttsId);
  if (from < 0) {
    return page;
  }
  const sameGroup = fromGroup.id === toGroup.id;
  let insertAt = Math.max(0, Math.min(index, toGroup.ttsIds.length));
  if (sameGroup && (from === insertAt || from + 1 === insertAt)) {
    return page;
  }
  const next = cloneCommentsPage(page);
  const liveFrom = next.commentGroups[sourceIndex];
  const liveTo = next.commentGroups[targetIndex];
  if (!liveFrom || !liveTo) {
    return page;
  }
  liveFrom.ttsIds.splice(from, 1);
  if (sameGroup && from < insertAt) {
    insertAt -= 1;
  }
  liveTo.ttsIds.splice(insertAt, 0, ttsId);
  return next;
}

export function removeGroup(page: CommentsPageFormValues, groupId: string): CommentsPageFormValues {
  const index = page.commentGroups.findIndex((group) => group.id === groupId);
  if (index < 0) {
    return page;
  }
  const next = cloneCommentsPage(page);
  removeGroupAt(next, index);
  return next;
}

export function removeComment(
  page: CommentsPageFormValues,
  commentId: string,
): CommentsPageFormValues {
  const index = findGroupIndexByComment(page, commentId);
  if (index < 0) {
    return page;
  }
  const group = page.commentGroups[index];
  if (!group) {
    return page;
  }
  if (group.commentIds.length === 1) {
    return removeGroup(page, group.id);
  }
  const next = cloneCommentsPage(page);
  const live = next.commentGroups[index];
  if (!live) {
    return page;
  }
  live.commentIds = live.commentIds.filter((id) => id !== commentId);
  return next;
}

export function removeReply(page: CommentsPageFormValues, ttsId: string): CommentsPageFormValues {
  const index = findGroupIndexByReply(page, ttsId);
  if (index < 0) {
    return page;
  }
  const next = cloneCommentsPage(page);
  const group = next.commentGroups[index];
  if (!group) {
    return page;
  }
  group.ttsIds = group.ttsIds.filter((id) => id !== ttsId);
  dropTts(next, [ttsId]);
  return next;
}

export function addReply(
  page: CommentsPageFormValues,
  groupId: string,
  options: VoiceOption[],
): CommentsPageFormValues {
  const index = page.commentGroups.findIndex((group) => group.id === groupId);
  if (index < 0) {
    return page;
  }
  const next = cloneCommentsPage(page);
  const group = next.commentGroups[index];
  if (!group) {
    return page;
  }
  const lastReplyId = group.ttsIds.at(-1);
  const source = lastReplyId ? next.tts.find((item) => item.id === lastReplyId) : undefined;
  const reply = createTtsInput(options, source);
  group.ttsIds.push(reply.id);
  next.tts.push(reply);
  return next;
}

export function insertReplyAfter(
  page: CommentsPageFormValues,
  ttsId: string,
  options: VoiceOption[],
): CommentsPageFormValues {
  const index = findGroupIndexByReply(page, ttsId);
  if (index < 0) {
    return page;
  }
  const next = cloneCommentsPage(page);
  const group = next.commentGroups[index];
  if (!group) {
    return page;
  }
  const from = group.ttsIds.indexOf(ttsId);
  if (from < 0) {
    return page;
  }
  const source = next.tts.find((item) => item.id === ttsId);
  const reply = createTtsInput(options, source);
  group.ttsIds.splice(from + 1, 0, reply.id);
  next.tts.push(reply);
  return next;
}

export function setCommentBody(
  page: CommentsPageFormValues,
  commentId: string,
  body: string,
): CommentsPageFormValues {
  const index = page.comments.findIndex((comment) => comment.id === commentId);
  if (index < 0) {
    return page;
  }
  const current = page.comments[index];
  if (!current || current.body === body) {
    return page;
  }
  const next = cloneCommentsPage(page);
  const comment = next.comments[index];
  if (!comment) {
    return page;
  }
  comment.body = body;
  return next;
}

export function normalizeCommentGroupDisplayText(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized === "" ? null : normalized;
}

export function setGroupDisplayText(
  page: CommentsPageFormValues,
  groupId: string,
  displayText: string | null,
): CommentsPageFormValues {
  const index = page.commentGroups.findIndex((group) => group.id === groupId);
  if (index < 0) {
    return page;
  }
  const next = cloneCommentsPage(page);
  const group = next.commentGroups[index];
  if (!group) {
    return page;
  }
  group.displayText = normalizeCommentGroupDisplayText(displayText);
  return next;
}

export type CommentDragData = {
  kind: "group" | "comment" | "reply";
  pageId: string;
  groupId: string;
  entityId: string;
};

export type CommentDropData =
  | { kind: "reorder-group"; pageId: string; index: number }
  | { kind: "merge-group"; pageId: string; groupId: string }
  | { kind: "comment-slot"; pageId: string; groupId: string; index: number }
  | { kind: "new-group"; pageId: string; index: number }
  | { kind: "reply-slot"; pageId: string; groupId: string; index: number };

export function applyCommentDrop(
  page: CommentsPageFormValues,
  drag: CommentDragData,
  drop: CommentDropData,
): CommentsPageFormValues {
  if (drag.pageId !== page.id || drop.pageId !== page.id) {
    return page;
  }

  if (drag.kind === "group" && drop.kind === "reorder-group") {
    return moveGroup(page, drag.groupId, drop.index);
  }
  if (drag.kind === "group" && drop.kind === "merge-group") {
    return mergeGroupInto(page, drag.groupId, drop.groupId);
  }
  if (drag.kind === "comment" && drop.kind === "comment-slot") {
    return moveComment(page, drag.entityId, drop.groupId, drop.index);
  }
  if (drag.kind === "comment" && drop.kind === "new-group") {
    return detachComment(page, drag.entityId, drop.index);
  }
  if (drag.kind === "reply" && drop.kind === "reply-slot") {
    return moveReply(page, drag.entityId, drop.groupId, drop.index);
  }
  return page;
}

export function lastCommentMovePreview(page: CommentsPageFormValues, commentId: string) {
  const group = page.commentGroups.find((item) => item.commentIds.includes(commentId));
  if (!group || group.commentIds.length !== 1) {
    return null;
  }
  return { replyCount: group.ttsIds.length };
}

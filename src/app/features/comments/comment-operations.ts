import { type CommentGroup, type NiconicoComment } from "@/_schemas/project/comments";
import type { CommentsPageFormValues } from "@/app/features/page/model/page-form-schema";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import { createTtsInput } from "@/app/features/tts";
import type { VoiceOption } from "@/_schemas";
import {
  createCommentScenesFromGroupIds,
  spokenCommentGroupId,
} from "@/server/features/project/comments-presentation";

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
      presentation: page.meta.presentation,
    },
    comments: page.comments.map((comment) => ({ ...comment })),
    commentGroups: page.commentGroups.map((group) => ({
      ...group,
      commentIds: [...group.commentIds],
      ttsIds: [...group.ttsIds],
    })),
    commentScenes: page.commentScenes.map((scene) => ({
      ...scene,
      groupIds: [...scene.groupIds],
    })),
    tts: page.tts.map(cloneTts),
  };
}

export function commentsStructureKey(page: CommentsPageFormValues) {
  return JSON.stringify({
    groups: page.commentGroups.map((group) => ({
      id: group.id,
      commentIds: group.commentIds,
      ttsIds: group.ttsIds,
    })),
    scenes: page.commentScenes.map((scene) => ({
      id: scene.id,
      groupIds: scene.groupIds,
    })),
  });
}

export function commentsEditFingerprint(page: CommentsPageFormValues) {
  return JSON.stringify({
    title: page.title,
    tags: page.meta.tags,
    niconico: page.meta.niconico,
    presentation: page.meta.presentation,
    comments: page.comments,
    commentGroups: page.commentGroups,
    commentScenes: page.commentScenes,
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
  const created: CommentGroup[] = [];
  for (const commentId of commentIds) {
    const comment = known.get(commentId);
    if (inserted.has(commentId) || !comment || comment.hidden) {
      continue;
    }
    const group = createGroup([commentId]);
    next.commentGroups.push(group);
    created.push(group);
    inserted.add(commentId);
  }
  next.commentScenes.push(
    ...createCommentScenesFromGroupIds(
      created.map((group) => group.id),
      next.meta.presentation,
    ),
  );
  return next;
}

function removeGroupAt(page: CommentsPageFormValues, index: number) {
  const group = page.commentGroups[index];
  if (!group) {
    return;
  }
  dropTts(page, group.ttsIds);
  page.commentGroups.splice(index, 1);
  page.commentScenes = page.commentScenes.flatMap((scene) => {
    const groupIds = scene.groupIds.filter((id) => id !== group.id);
    return groupIds.length > 0 ? [{ ...scene, groupIds }] : [];
  });
}

function firstCommentVposMs(page: CommentsPageFormValues, groupId: string | undefined) {
  if (!groupId) {
    return Number.POSITIVE_INFINITY;
  }
  const group = page.commentGroups.find((item) => item.id === groupId);
  const commentId = group?.commentIds[0];
  if (!commentId) {
    return Number.POSITIVE_INFINITY;
  }
  const comment = page.comments.find((item) => item.id === commentId);
  return comment?.vposMs ?? Number.POSITIVE_INFINITY;
}

export function sortCommentGroupsByFirstCommentTime(
  page: CommentsPageFormValues,
): CommentsPageFormValues {
  const ranked = page.commentScenes.map((scene, index) => ({
    scene,
    index,
    vposMs: firstCommentVposMs(page, spokenCommentGroupId(scene)),
  }));
  ranked.sort((left, right) => {
    if (left.vposMs !== right.vposMs) {
      return left.vposMs - right.vposMs;
    }
    return left.index - right.index;
  });
  if (ranked.every((item, index) => item.index === index)) {
    return page;
  }
  const next = cloneCommentsPage(page);
  next.commentScenes = ranked.map((item) => next.commentScenes[item.index]!);
  return next;
}

export function moveScene(
  page: CommentsPageFormValues,
  sceneId: string,
  toIndex: number,
): CommentsPageFormValues {
  const fromIndex = page.commentScenes.findIndex((scene) => scene.id === sceneId);
  if (fromIndex < 0) {
    return page;
  }
  let insertAt = Math.max(0, Math.min(toIndex, page.commentScenes.length));
  if (fromIndex === insertAt || fromIndex + 1 === insertAt) {
    return page;
  }
  const next = cloneCommentsPage(page);
  const [scene] = next.commentScenes.splice(fromIndex, 1);
  if (!scene) {
    return page;
  }
  if (fromIndex < insertAt) {
    insertAt -= 1;
  }
  next.commentScenes.splice(insertAt, 0, scene);
  return next;
}

export function moveGroup(
  page: CommentsPageFormValues,
  sceneId: string,
  groupId: string,
  toIndex: number,
): CommentsPageFormValues {
  const sceneIndex = page.commentScenes.findIndex((scene) => scene.id === sceneId);
  const scene = page.commentScenes[sceneIndex];
  if (!scene || !scene.groupIds.includes(groupId)) {
    return page;
  }
  const fromIndex = scene.groupIds.indexOf(groupId);
  let insertAt = Math.max(0, Math.min(toIndex, scene.groupIds.length));
  if (fromIndex < 0 || fromIndex === insertAt || fromIndex + 1 === insertAt) {
    return page;
  }
  const next = cloneCommentsPage(page);
  const live = next.commentScenes[sceneIndex];
  if (!live) {
    return page;
  }
  const [group] = live.groupIds.splice(fromIndex, 1);
  if (!group) {
    return page;
  }
  if (fromIndex < insertAt) {
    insertAt -= 1;
  }
  live.groupIds.splice(insertAt, 0, group);
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
  if (!sameGroup) {
    return page;
  }
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

export type CommentDragData =
  | { kind: "scene"; pageId: string; sceneId: string; entityId: string }
  | { kind: "group"; pageId: string; sceneId: string; groupId: string; entityId: string }
  | { kind: "reply"; pageId: string; sceneId: string; groupId: string; entityId: string };

export type CommentDropData =
  | { kind: "reorder-scene"; pageId: string; index: number }
  | { kind: "reorder-group"; pageId: string; sceneId: string; index: number }
  | { kind: "reply-slot"; pageId: string; sceneId: string; groupId: string; index: number };

export function applyCommentDrop(
  page: CommentsPageFormValues,
  drag: CommentDragData,
  drop: CommentDropData,
): CommentsPageFormValues {
  if (drag.pageId !== page.id || drop.pageId !== page.id) {
    return page;
  }

  if (drag.kind === "scene" && drop.kind === "reorder-scene") {
    return moveScene(page, drag.sceneId, drop.index);
  }
  if (drag.kind === "group" && drop.kind === "reorder-group" && drag.sceneId === drop.sceneId) {
    return moveGroup(page, drag.sceneId, drag.groupId, drop.index);
  }
  if (
    drag.kind === "reply" &&
    drop.kind === "reply-slot" &&
    drag.sceneId === drop.sceneId &&
    drag.groupId === drop.groupId
  ) {
    return moveReply(page, drag.entityId, drop.groupId, drop.index);
  }
  return page;
}

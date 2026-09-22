import type {
  CommentsPageFormValues,
  PageFormValues,
} from "@/app/features/page/model/page-form-schema";
import { cloneCommentsPage } from "@/app/features/comments/comment-operations";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import { commentGroupSlot } from "@/server/features/project/comments-presentation";

export type ApplyCommentGroupQaRepliesResult =
  | { ok: true; page: CommentsPageFormValues }
  | {
      ok: false;
      reason: "missing-group" | "already-replied" | "empty";
    };

export function cloneCommentQaTts(items: readonly TtsFormValues[]): TtsFormValues[] {
  return items.map((item) => ({
    ...item,
    speech: item.speech ? { ...item.speech } : {},
  }));
}

export function commentQaReadLabel(
  page: {
    commentGroups: CommentsPageFormValues["commentGroups"];
    commentScenes: CommentsPageFormValues["commentScenes"];
    meta: Pick<CommentsPageFormValues["meta"], "presentation">;
  },
  groupId: string,
) {
  return commentGroupSlot(
    page.commentGroups,
    page.commentScenes,
    page.meta.presentation,
    groupId,
  ) === "center"
    ? "Read"
    : "Display only";
}

export function listUnansweredCommentGroupIds(
  page: Pick<CommentsPageFormValues, "commentGroups" | "commentScenes">,
) {
  const byId = new Map(page.commentGroups.map((group) => [group.id, group]));
  return page.commentScenes.flatMap((scene) =>
    scene.groupIds.flatMap((id) => {
      const group = byId.get(id);
      return group && group.ttsIds.length === 0 ? [id] : [];
    }),
  );
}

export function filledCommentQaReplies(replies: readonly TtsFormValues[]) {
  return replies.filter((reply) => reply.text.trim() !== "");
}

export function commentQaDraftHasInput(replies: readonly TtsFormValues[]) {
  return filledCommentQaReplies(replies).length > 0;
}

export function pendingCommentQaGroupIds(
  targetIds: readonly string[],
  savedIds: ReadonlySet<string>,
) {
  return targetIds.filter((id) => !savedIds.has(id));
}

export function commentQaPosition(targetIds: readonly string[], currentId: string) {
  const index = targetIds.indexOf(currentId);
  return {
    current: index >= 0 ? index + 1 : 0,
    total: targetIds.length,
  };
}

export function moveCommentQaCursor(
  pendingIds: readonly string[],
  currentId: string,
  delta: number,
) {
  const index = pendingIds.indexOf(currentId);
  if (index < 0) {
    return pendingIds[0] ?? currentId;
  }
  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= pendingIds.length) {
    return currentId;
  }
  return pendingIds[nextIndex] ?? currentId;
}

export function nextCommentQaGroupId(
  targetIds: readonly string[],
  remaining: readonly string[],
  savedGroupId: string,
) {
  const currentTargetIndex = targetIds.indexOf(savedGroupId);
  return remaining.find((id) => targetIds.indexOf(id) > currentTargetIndex) ?? remaining[0] ?? null;
}

export function uncommittedCommentQaGroupIds(
  drafts: Readonly<Record<string, readonly TtsFormValues[]>>,
  pendingIds: readonly string[],
) {
  return pendingIds.filter((id) => commentQaDraftHasInput(drafts[id] ?? []));
}

function sameReplyIds(ttsIds: readonly string[], replyIds: readonly string[]) {
  return ttsIds.length === replyIds.length && ttsIds.every((id, index) => id === replyIds[index]);
}

export function applyCommentGroupQaReplies(
  page: CommentsPageFormValues,
  groupId: string,
  replies: readonly TtsFormValues[],
): ApplyCommentGroupQaRepliesResult {
  const filled = cloneCommentQaTts(filledCommentQaReplies(replies));
  if (filled.length === 0) {
    return { ok: false, reason: "empty" };
  }
  const group = page.commentGroups.find((item) => item.id === groupId);
  if (!group) {
    return { ok: false, reason: "missing-group" };
  }
  const replyIds = filled.map((reply) => reply.id);
  const retry = sameReplyIds(group.ttsIds, replyIds);
  if (group.ttsIds.length > 0 && !retry) {
    return { ok: false, reason: "already-replied" };
  }

  const next = cloneCommentsPage(page);
  const live = next.commentGroups.find((item) => item.id === groupId);
  if (!live) {
    return { ok: false, reason: "missing-group" };
  }
  if (retry) {
    const remove = new Set(replyIds);
    next.tts = next.tts.filter((item) => !remove.has(item.id));
  }
  live.ttsIds = replyIds;
  next.tts.push(...filled);
  return { ok: true, page: next };
}

export function commitCommentsQaPage({
  page,
  writeForm,
  upsertPage,
}: {
  page: CommentsPageFormValues;
  writeForm: (page: CommentsPageFormValues) => void;
  upsertPage: (pageId: string, page: PageFormValues) => void;
}) {
  writeForm(page);
  upsertPage(page.id, page);
}

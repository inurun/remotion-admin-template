import type {
  CommentsPageFormValues,
  PageFormValues,
} from "@/app/features/page/model/page-form-schema";
import type { DragEndEvent } from "@dnd-kit/react";
import { useCallback } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useSelectedPage } from "@/app/features/page";
import { useSettings } from "@/app/features/settings";
import {
  addReply,
  applyCommentDrop,
  insertReplyAfter,
  removeComment,
  removeGroup,
  removeReply,
  setGroupDisplayText,
  setCommentBody,
  type CommentDragData,
  type CommentDropData,
} from "@/app/features/comments/comment-operations";
import {
  listPageTtsInPlaybackOrder,
  resolveCommentGroups,
} from "@/app/features/comments/resolve-comment-groups";
import { useTts, useTtsTextFocus } from "@/app/features/tts";

export function useCommentsEditor() {
  const form = useFormContext<PageFormValues>();
  const { pageId } = useSelectedPage();
  const { options } = useSettings();
  const { selectTts, clearSelection, selectedTtsId } = useTts();
  const { requestTextFocus } = useTtsTextFocus();
  const page = useWatch({ control: form.control }) as PageFormValues;

  const commentsPage = page.type === "comments" ? page : null;
  const groups = commentsPage ? resolveCommentGroups(commentsPage) : [];

  const apply = useCallback(
    (next: CommentsPageFormValues) => {
      form.setValue("comments", next.comments, { shouldDirty: true, shouldValidate: true });
      form.setValue("commentGroups", next.commentGroups, {
        shouldDirty: true,
        shouldValidate: true,
      });
      form.setValue("tts", next.tts, { shouldDirty: true, shouldValidate: true });
    },
    [form],
  );

  const focusReply = useCallback(
    (ttsId: string) => {
      selectTts(ttsId);
      requestTextFocus(ttsId);
    },
    [requestTextFocus, selectTts],
  );

  const selectAfterRemovingTts = useCallback(
    (current: CommentsPageFormValues, removedIds: ReadonlySet<string>) => {
      const playback = listPageTtsInPlaybackOrder(current).map((item) => item.id);
      const remaining = playback.filter((id) => !removedIds.has(id));
      if (remaining.length === 0) {
        clearSelection();
        return;
      }
      const origin = selectedTtsId && removedIds.has(selectedTtsId) ? selectedTtsId : null;
      if (!origin) {
        return;
      }
      const start = Math.max(0, playback.indexOf(origin));
      const nextId =
        remaining.find((id) => playback.indexOf(id) >= start) ?? remaining.at(-1) ?? null;
      if (nextId) {
        focusReply(nextId);
        return;
      }
      clearSelection();
    },
    [clearSelection, focusReply, selectedTtsId],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (event.canceled || !commentsPage) {
        return;
      }
      const drag = event.operation.source?.data as CommentDragData | undefined;
      const drop = event.operation.target?.data as CommentDropData | undefined;
      if (!drag || !drop) {
        return;
      }
      apply(applyCommentDrop(commentsPage, drag, drop));
    },
    [apply, commentsPage],
  );

  return {
    pageId,
    commentsPage,
    groups,
    handleDragEnd,
    addReply: (groupId: string) => {
      if (!commentsPage) {
        return;
      }
      const next = addReply(commentsPage, groupId, options);
      apply(next);
      const addedId = next.commentGroups.find((group) => group.id === groupId)?.ttsIds.at(-1);
      if (addedId) {
        focusReply(addedId);
      }
    },
    insertReplyAfter: (ttsId: string) => {
      if (!commentsPage) {
        return;
      }
      const next = insertReplyAfter(commentsPage, ttsId, options);
      apply(next);
      const group = next.commentGroups.find((item) => item.ttsIds.includes(ttsId));
      const from = group?.ttsIds.indexOf(ttsId) ?? -1;
      const addedId = from >= 0 ? group?.ttsIds[from + 1] : undefined;
      if (addedId) {
        focusReply(addedId);
      }
    },
    selectReply: (ttsId: string) => {
      selectTts(ttsId);
    },
    removeGroup: (groupId: string) => {
      if (!commentsPage) {
        return;
      }
      const group = commentsPage.commentGroups.find((item) => item.id === groupId);
      const next = removeGroup(commentsPage, groupId);
      apply(next);
      if (group) {
        selectAfterRemovingTts(commentsPage, new Set(group.ttsIds));
      }
    },
    removeComment: (commentId: string) => {
      if (!commentsPage) {
        return;
      }
      apply(removeComment(commentsPage, commentId));
    },
    removeReply: (ttsId: string) => {
      if (!commentsPage) {
        return;
      }
      const next = removeReply(commentsPage, ttsId);
      apply(next);
      selectAfterRemovingTts(commentsPage, new Set([ttsId]));
    },
    setCommentBody: (commentId: string, body: string) => {
      if (!commentsPage) {
        return;
      }
      apply(setCommentBody(commentsPage, commentId, body));
    },
    setDisplayText: (groupId: string, value: string | null) => {
      if (!commentsPage) {
        return;
      }
      apply(setGroupDisplayText(commentsPage, groupId, value));
    },
  };
}

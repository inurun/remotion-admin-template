import type {
  CommentsPageFormValues,
  PageFormValues,
} from "@/app/features/page/model/page-form-schema";
import type { DragEndEvent } from "@dnd-kit/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useSelectedPage } from "@/app/features/page";
import { useSettings } from "@/app/features/settings";
import {
  addReply,
  applyCommentDrop,
  insertReplyAfter,
  removeComment,
  removeGroup,
  removeReply,
  type CommentDragData,
  type CommentDropData,
} from "@/app/features/comments/comment-operations";
import { listPageTtsInPlaybackOrder } from "@/app/features/comments/resolve-comment-groups";
import { useTts, useTtsTextFocus } from "@/app/features/tts";
import {
  asCommentsPage,
  commentsById,
  commentsEditorStructureKey,
  indexById,
  isCommentsEditorTextField,
  selectCommentsEditorStructure,
} from "./comments-editor.lib";

function useCommentsEditorStructure() {
  const form = useFormContext<PageFormValues>();
  const { pageId } = useSelectedPage();
  const [structure, setStructure] = useState(() => selectCommentsEditorStructure(form.getValues()));
  const keyRef = useRef(commentsEditorStructureKey(structure));

  useEffect(() => {
    const next = selectCommentsEditorStructure(form.getValues());
    const nextKey = commentsEditorStructureKey(next);
    if (nextKey === keyRef.current) {
      return;
    }
    keyRef.current = nextKey;
    setStructure(next);
  }, [form, pageId]);

  useEffect(() => {
    const subscription = form.watch((_values, info) => {
      if (isCommentsEditorTextField(info.name)) {
        return;
      }
      const next = selectCommentsEditorStructure(form.getValues());
      const nextKey = commentsEditorStructureKey(next);
      if (nextKey === keyRef.current) {
        return;
      }
      keyRef.current = nextKey;
      setStructure(next);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  return structure;
}

export function useCommentsEditor() {
  const form = useFormContext<PageFormValues>();
  const { pageId } = useSelectedPage();
  const { options } = useSettings();
  const { selectTts, clearSelection, selectedTtsId } = useTts();
  const { requestTextFocus } = useTtsTextFocus();
  const structure = useCommentsEditorStructure();

  const commentIndexById = useMemo(
    () => indexById(structure?.comments.map((comment) => comment.id) ?? []),
    [structure],
  );
  const ttsIndexById = useMemo(() => indexById(structure?.ttsIds ?? []), [structure]);
  const commentsLookup = useMemo(() => commentsById(structure?.comments ?? []), [structure]);

  const apply = useCallback(
    (next: CommentsPageFormValues) => {
      form.setValue("comments", next.comments, { shouldDirty: true });
      form.setValue("commentGroups", next.commentGroups, { shouldDirty: true });
      form.setValue("tts", next.tts, { shouldDirty: true });
    },
    [form],
  );

  const readPage = useCallback(() => asCommentsPage(form.getValues()), [form]);

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
      const commentsPage = readPage();
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
    [apply, readPage],
  );

  const addReplyToGroup = useCallback(
    (groupId: string) => {
      const commentsPage = readPage();
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
    [apply, focusReply, options, readPage],
  );

  const insertReplyAfterId = useCallback(
    (ttsId: string) => {
      const commentsPage = readPage();
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
    [apply, focusReply, options, readPage],
  );

  const selectReply = useCallback(
    (ttsId: string) => {
      selectTts(ttsId);
    },
    [selectTts],
  );

  const removeGroupById = useCallback(
    (groupId: string) => {
      const commentsPage = readPage();
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
    [apply, readPage, selectAfterRemovingTts],
  );

  const removeCommentById = useCallback(
    (commentId: string) => {
      const commentsPage = readPage();
      if (!commentsPage) {
        return;
      }
      apply(removeComment(commentsPage, commentId));
    },
    [apply, readPage],
  );

  const removeReplyById = useCallback(
    (ttsId: string) => {
      const commentsPage = readPage();
      if (!commentsPage) {
        return;
      }
      const next = removeReply(commentsPage, ttsId);
      apply(next);
      selectAfterRemovingTts(commentsPage, new Set([ttsId]));
    },
    [apply, readPage, selectAfterRemovingTts],
  );

  return {
    pageId,
    structure,
    commentIndexById,
    ttsIndexById,
    commentsLookup,
    handleDragEnd,
    addReply: addReplyToGroup,
    insertReplyAfter: insertReplyAfterId,
    selectReply,
    removeGroup: removeGroupById,
    removeComment: removeCommentById,
    removeReply: removeReplyById,
  };
}

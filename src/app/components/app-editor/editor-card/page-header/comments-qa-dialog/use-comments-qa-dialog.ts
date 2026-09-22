import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useForm, useFormContext, useWatch } from "react-hook-form";
import { Dialog } from "@base-ui/react/dialog";
import type {
  CommentsPageFormValues,
  PageFormValues,
} from "@/app/features/page/model/page-form-schema";
import { usePageFormScope } from "@/app/features/page/context/page-form-context";
import { useSaveProjectChanges } from "@/app/features/editor/lib/use-save-project-changes";
import { useEditorSessionStoreApi } from "@/app/features/editor/store/editor-session-store-context";
import { commentGroupDisplayText } from "@/app/features/comments";
import {
  applyCommentGroupQaReplies,
  cloneCommentQaTts,
  commentQaPosition,
  commentQaReadLabel,
  commitCommentsQaPage,
  filledCommentQaReplies,
  listUnansweredCommentGroupIds,
  nextCommentQaGroupId,
  pendingCommentQaGroupIds,
  uncommittedCommentQaGroupIds,
} from "@/app/features/comments/comments-qa";
import { createIdlePageFormValues } from "@/app/features/page/lib/page-form-sync";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import { useCommentsQaDialogHotkeys } from "./comments-qa-dialog.hotkeys";

function asCommentsPage(page: PageFormValues): CommentsPageFormValues | null {
  return page.type === "comments" ? page : null;
}

function idleDraftPage(tts: TtsFormValues[] = []): PageFormValues {
  return { ...createIdlePageFormValues(), tts };
}

function focusQaComposer() {
  let inner = 0;
  const outer = requestAnimationFrame(() => {
    inner = requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("[data-tts-composer] .cm-content")?.focus();
    });
  });
  return () => {
    cancelAnimationFrame(outer);
    cancelAnimationFrame(inner);
  };
}

export function useCommentsQaDialog() {
  const { control, getValues, setValue } = useFormContext<PageFormValues>();
  const { pageId, isReady } = usePageFormScope();
  const { save } = useSaveProjectChanges();
  const editorStore = useEditorSessionStoreApi();
  const comments = useWatch({ control, name: "comments" });
  const commentGroups = useWatch({ control, name: "commentGroups" });
  const commentScenes = useWatch({ control, name: "commentScenes" });
  const presentation = useWatch({ control, name: "meta.presentation" }) ?? "single";
  const draftForm = useForm<PageFormValues>({
    defaultValues: idleDraftPage(),
  });
  const draftTts = useWatch({ control: draftForm.control, name: "tts" }) ?? [];
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, TtsFormValues[]>>({});

  const resetDraftForm = useCallback(
    (tts: TtsFormValues[] = []) => {
      draftForm.reset(idleDraftPage(cloneCommentQaTts(tts)));
    },
    [draftForm],
  );

  const snapshotCurrentDraft = useCallback(
    (groupId: string | null, currentDrafts: Record<string, TtsFormValues[]>) => {
      if (!groupId) {
        return currentDrafts;
      }
      return {
        ...currentDrafts,
        [groupId]: cloneCommentQaTts(draftForm.getValues("tts")),
      };
    },
    [draftForm],
  );

  const resetSession = useCallback(() => {
    setTargetIds([]);
    setSavedIds(new Set());
    setCurrentId(null);
    setDrafts({});
    setStatus(null);
    setSaving(false);
    resetDraftForm();
  }, [resetDraftForm]);

  const pendingIds = useMemo(
    () => pendingCommentQaGroupIds(targetIds, savedIds),
    [savedIds, targetIds],
  );
  const position = currentId ? commentQaPosition(targetIds, currentId) : { current: 0, total: 0 };
  const canDone = filledCommentQaReplies(draftTts).length > 0;
  const currentIndex = currentId ? pendingIds.indexOf(currentId) : -1;
  const canBack = !saving && currentIndex > 0;
  const canNext = !saving && currentIndex >= 0 && currentIndex < pendingIds.length - 1;
  const currentGroup = commentGroups?.find((group) => group.id === currentId) ?? null;
  const commentsById = useMemo(
    () => new Map((comments ?? []).map((comment) => [comment.id, comment])),
    [comments],
  );
  const displayText = currentGroup ? commentGroupDisplayText(currentGroup, commentsById) : "";
  const readLabel =
    currentId && commentGroups && commentScenes
      ? commentQaReadLabel(
          {
            commentGroups,
            commentScenes,
            meta: { presentation },
          },
          currentId,
        )
      : "Read";
  const groupComments = (currentGroup?.commentIds ?? []).flatMap((id) => {
    const comment = commentsById.get(id);
    return comment ? [comment] : [];
  });

  const startSession = useCallback(() => {
    const page = asCommentsPage(getValues());
    if (!page) {
      return false;
    }
    const ids = listUnansweredCommentGroupIds(page);
    if (ids.length === 0) {
      return false;
    }
    setTargetIds(ids);
    setSavedIds(new Set());
    setCurrentId(ids[0] ?? null);
    setDrafts({});
    setStatus(null);
    resetDraftForm();
    return true;
  }, [getValues, resetDraftForm]);

  const confirmDiscard = useCallback(
    (pending = pendingIds, nextDrafts = snapshotCurrentDraft(currentId, drafts)) => {
      if (uncommittedCommentQaGroupIds(nextDrafts, pending).length === 0) {
        return true;
      }
      return window.confirm("Discard unsaved replies?");
    },
    [currentId, drafts, pendingIds, snapshotCurrentDraft],
  );

  const closeSession = useCallback(
    (force = false) => {
      if (saving) {
        return;
      }
      if (!force && !confirmDiscard()) {
        return;
      }
      resetSession();
      setOpen(false);
    },
    [confirmDiscard, resetSession, saving],
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean, eventDetails: Dialog.Root.ChangeEventDetails) => {
      if (saving) {
        eventDetails.cancel();
        return;
      }
      if (nextOpen) {
        if (!startSession()) {
          eventDetails.cancel();
          return;
        }
        setOpen(true);
        return;
      }
      if (!confirmDiscard()) {
        eventDetails.cancel();
        return;
      }
      resetSession();
      setOpen(false);
    },
    [confirmDiscard, resetSession, saving, startSession],
  );

  const showGroup = useCallback(
    (groupId: string | null, nextDrafts: Record<string, TtsFormValues[]>) => {
      setDrafts(nextDrafts);
      setCurrentId(groupId);
      resetDraftForm(groupId ? (nextDrafts[groupId] ?? []) : []);
      setStatus(null);
    },
    [resetDraftForm],
  );

  const go = useCallback(
    (delta: number) => {
      if (!currentId || saving) {
        return;
      }
      const index = pendingIds.indexOf(currentId);
      const nextId = pendingIds[index + delta];
      if (!nextId) {
        return;
      }
      showGroup(nextId, snapshotCurrentDraft(currentId, drafts));
    },
    [currentId, drafts, pendingIds, saving, showGroup, snapshotCurrentDraft],
  );

  const writeForm = useCallback(
    (page: CommentsPageFormValues) => {
      setValue("commentGroups", page.commentGroups, { shouldDirty: true, shouldValidate: true });
      setValue("tts", page.tts, { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

  const applyCurrent = useCallback(async () => {
    const page = asCommentsPage(getValues());
    if (!page || !currentId || !isReady || saving || !canDone) {
      return false;
    }
    const liveDrafts = snapshotCurrentDraft(currentId, drafts);
    setDrafts(liveDrafts);
    const applied = applyCommentGroupQaReplies(page, currentId, liveDrafts[currentId] ?? []);
    if (!applied.ok) {
      setStatus(
        applied.reason === "already-replied"
          ? "Replies already exist."
          : "Could not apply replies.",
      );
      return false;
    }
    commitCommentsQaPage({
      page: applied.page,
      writeForm,
      upsertPage: (id, nextPage) => editorStore.getState().upsertPage(id, nextPage),
    });
    setSaving(true);
    try {
      await save();
      return true;
    } catch {
      setStatus("Save failed. Retry with the same replies.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [
    canDone,
    currentId,
    drafts,
    editorStore,
    getValues,
    isReady,
    save,
    saving,
    snapshotCurrentDraft,
    writeForm,
  ]);

  const done = useCallback(async () => {
    const groupId = currentId;
    if (!groupId) {
      return;
    }
    const saved = await applyCurrent();
    if (!saved) {
      return;
    }
    const nextSaved = new Set(savedIds);
    nextSaved.add(groupId);
    const remaining = pendingCommentQaGroupIds(targetIds, nextSaved);
    setSavedIds(nextSaved);
    const liveDrafts = snapshotCurrentDraft(groupId, drafts);
    if (remaining.length === 0) {
      closeSession(true);
      return;
    }
    const wasLastTarget = targetIds.at(-1) === groupId;
    if (wasLastTarget) {
      if (!confirmDiscard(remaining, liveDrafts)) {
        showGroup(remaining[0] ?? null, liveDrafts);
        return;
      }
      closeSession(true);
      return;
    }
    showGroup(nextCommentQaGroupId(targetIds, remaining, groupId), liveDrafts);
  }, [
    applyCurrent,
    closeSession,
    confirmDiscard,
    currentId,
    drafts,
    savedIds,
    showGroup,
    snapshotCurrentDraft,
    targetIds,
  ]);

  useEffect(() => {
    setOpen(false);
    resetSession();
  }, [pageId, resetSession]);

  const submitDone = useCallback(() => {
    void done();
  }, [done]);

  useCommentsQaDialogHotkeys({
    enabled: open && !saving && canDone,
    onDone: submitDone,
  });

  useLayoutEffect(() => {
    if (!open || saving || !currentId) {
      return;
    }
    return focusQaComposer();
  }, [currentId, open, saving]);

  return {
    open,
    saving,
    status,
    position,
    displayText,
    comments: groupComments,
    readLabel,
    spoken: readLabel === "Read",
    canDone,
    canBack,
    canNext,
    currentGroupId: currentId,
    qaSelectionKey: `${pageId ?? ""}:qa`,
    draftForm,
    handleOpenChange,
    close: () => closeSession(),
    back: () => go(-1),
    next: () => go(1),
    done: () => void done(),
  };
}

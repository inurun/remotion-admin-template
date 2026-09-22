import type {
  CommentsPageFormValues,
  PageFormValues,
} from "@/app/features/page/model/page-form-schema";
import { usePageFormScope } from "@/app/features/page/context/page-form-context";
import { useSaveProjectChanges } from "@/app/features/editor/lib/use-save-project-changes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useFormContext } from "react-hook-form";
import { useSettings } from "@/app/features/settings";
import { createAliasMap } from "@/app/features/zen";
import {
  applyZenCommentsPage,
  parseZenCommentsPage,
  serializeZenCommentsPage,
} from "@/app/features/zen/comments-zen";
import {
  createCommentsDraftStorage,
  toCommentsZenSnapshot,
  type CommentsZenDraft,
} from "@/app/features/zen/comments-draft-storage";
import {
  commentsEditFingerprint,
  insertedCommentIds,
} from "@/app/features/comments/comment-operations";
import { useProjectRoute } from "@/app/features/project/context/project-route-context";
import type { ZenCompletionAlias } from "@/app/features/zen/components/zen-editor/zen-completion";

const storage = createCommentsDraftStorage(
  () => window.localStorage,
  () => {
    /* surfaced via saveOk flag */
  },
);

export function useCommentsZenDialog() {
  const { getValues, setValue } = useFormContext<PageFormValues>();
  const { voices, voiceSettings } = useSettings();
  const { pageId, isReady } = usePageFormScope();
  const { save } = useSaveProjectChanges();
  const { projectPath } = useProjectRoute();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("");
  const [editedGroupSettings, setEditedGroupSettings] = useState<
    CommentsZenDraft["editedGroupSettings"]
  >({});
  const [draftRevision, setDraftRevision] = useState(0);
  const [baseFingerprint, setBaseFingerprint] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [conflict, setConflict] = useState<"none" | "fingerprint" | "invalid">("none");
  const [pendingDraft, setPendingDraft] = useState<CommentsZenDraft | null>(null);
  const [localSaveOk, setLocalSaveOk] = useState(true);
  const applyingRevision = useRef<number | null>(null);

  const { aliases, aliasErrors } = useMemo(() => {
    const result = createAliasMap(voices, voiceSettings);
    return { aliases: result.aliases, aliasErrors: result.errors };
  }, [voiceSettings, voices]);

  const completionAliases = useMemo<ZenCompletionAlias[]>(
    () =>
      [...aliases.entries()].map(([alias, target]) => ({
        alias,
        avatarType: target.avatarType,
      })),
    [aliases],
  );

  const commentsPage = (): CommentsPageFormValues | null => {
    const page = getValues();
    return page.type === "comments" ? page : null;
  };

  const insertedComments =
    commentsPage()?.comments.filter((comment) =>
      commentsPage() ? insertedCommentIds(commentsPage()!).has(comment.id) : false,
    ) ?? [];

  const parsed = useMemo(() => {
    const page = getValues();
    if (page.type !== "comments") {
      return { title: "", tags: [], scenes: [], groups: [], errors: aliasErrors };
    }
    if (!source.trim() && source === "") {
      const empty = parseZenCommentsPage("", {
        aliases,
        insertedComments: page.comments,
        knownTtsIds: new Set(page.tts.map((item) => item.id)),
      });
      return { ...empty, errors: [...aliasErrors, ...empty.errors] };
    }
    const result = parseZenCommentsPage(source, {
      aliases,
      insertedComments: page.comments,
      knownTtsIds: new Set(page.tts.map((item) => item.id)),
    });
    return { ...result, errors: [...aliasErrors, ...result.errors] };
  }, [aliasErrors, aliases, getValues, source]);

  const persist = useCallback(
    (next: Partial<CommentsZenDraft> & { source: string }) => {
      const page = commentsPage();
      if (!projectPath || !pageId || !page) {
        return;
      }
      const draft: CommentsZenDraft = {
        version: 1,
        source: next.source,
        editedGroupSettings: next.editedGroupSettings ?? editedGroupSettings,
        updatedAt: new Date().toISOString(),
        draftRevision: next.draftRevision ?? draftRevision + 1,
        baseFingerprint: next.baseFingerprint ?? baseFingerprint,
        baseSnapshot: next.baseSnapshot ?? toCommentsZenSnapshot(page),
        targetFingerprint: next.targetFingerprint ?? null,
      };
      setDraftRevision(draft.draftRevision);
      setEditedGroupSettings(draft.editedGroupSettings);
      const ok = storage.write(projectPath, pageId, draft);
      setLocalSaveOk(ok);
      return draft;
    },
    [baseFingerprint, draftRevision, editedGroupSettings, pageId, projectPath],
  );

  const loadFromPage = useCallback(() => {
    const page = commentsPage();
    if (!page) {
      return;
    }
    const initial = serializeZenCommentsPage(page, aliases);
    setSource(initial);
    setEditedGroupSettings({});
    setBaseFingerprint(commentsEditFingerprint(page));
    setConflict("none");
    setPendingDraft(null);
    persist({
      source: initial,
      draftRevision: 1,
      editedGroupSettings: {},
      baseFingerprint: commentsEditFingerprint(page),
      baseSnapshot: toCommentsZenSnapshot(page),
    });
  }, [aliases, persist]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean, eventDetails: Dialog.Root.ChangeEventDetails) => {
      if (!nextOpen && eventDetails.reason === "escape-key") {
        eventDetails.cancel();
        return;
      }
      if (nextOpen) {
        const page = commentsPage();
        if (!page || !projectPath) {
          return;
        }
        const stored = storage.read(projectPath, page.id);
        const fingerprint = commentsEditFingerprint(page);
        if (stored.status === "ok") {
          const applied =
            stored.draft.targetFingerprint !== null &&
            stored.draft.targetFingerprint === fingerprint &&
            stored.draft.baseFingerprint === stored.draft.targetFingerprint;
          if (applied) {
            storage.remove(projectPath, page.id);
            setSource(serializeZenCommentsPage(page, aliases));
            setBaseFingerprint(fingerprint);
            setStatus(null);
            setConflict("none");
          } else if (stored.draft.baseFingerprint === fingerprint) {
            setSource(stored.draft.source);
            setEditedGroupSettings(stored.draft.editedGroupSettings);
            setDraftRevision(stored.draft.draftRevision);
            setBaseFingerprint(stored.draft.baseFingerprint);
            setStatus(`Draft restored ${stored.draft.updatedAt}`);
            setConflict("none");
          } else {
            setPendingDraft(stored.draft);
            setSource(serializeZenCommentsPage(page, aliases));
            setBaseFingerprint(fingerprint);
            setConflict("fingerprint");
            setStatus("Draft does not match the saved page.");
          }
        } else if (stored.status === "invalid") {
          setConflict("invalid");
          setStatus("Draft restore failed");
          setSource(serializeZenCommentsPage(page, aliases));
          setBaseFingerprint(fingerprint);
        } else {
          const initial = serializeZenCommentsPage(page, aliases);
          setSource(initial);
          setBaseFingerprint(fingerprint);
          setStatus(null);
          setConflict("none");
        }
      } else if (projectPath && pageId) {
        persist({ source, draftRevision });
      }
      setOpen(nextOpen);
    },
    [aliases, persist, projectPath, source, draftRevision],
  );

  const openZen = useCallback(() => {
    handleOpenChange(true, { reason: "none", cancel: () => undefined } as never);
  }, [handleOpenChange]);

  const updateSource = useCallback(
    (next: string) => {
      setSource(next);
      persist({ source: next });
    },
    [persist],
  );

  const apply = useCallback(async () => {
    const page = commentsPage();
    if (!page || parsed.errors.length > 0 || !isReady) {
      return;
    }
    const currentFingerprint = commentsEditFingerprint(page);
    if (currentFingerprint !== baseFingerprint && conflict === "none") {
      setStatus("Page changed while editing. Reload or continue carefully.");
    }
    const next = applyZenCommentsPage(page, parsed, aliases, editedGroupSettings);
    setValue("title", next.title, { shouldDirty: true, shouldValidate: true });
    setValue("meta.tags", next.meta.tags, { shouldDirty: true, shouldValidate: true });
    setValue("commentGroups", next.commentGroups, { shouldDirty: true, shouldValidate: true });
    setValue("commentScenes", next.commentScenes, { shouldDirty: true, shouldValidate: true });
    setValue("tts", next.tts, { shouldDirty: true, shouldValidate: true });
    const target = commentsEditFingerprint(next);
    applyingRevision.current = draftRevision;
    persist({
      source,
      draftRevision,
      targetFingerprint: target,
      baseFingerprint,
    });
    try {
      await save();
      if (applyingRevision.current === draftRevision && projectPath && pageId) {
        storage.remove(projectPath, pageId);
      }
      setBaseFingerprint(target);
      setOpen(false);
    } catch {
      setStatus("Apply save failed. Draft kept.");
    }
  }, [
    aliases,
    baseFingerprint,
    conflict,
    draftRevision,
    editedGroupSettings,
    isReady,
    pageId,
    parsed,
    persist,
    projectPath,
    save,
    setValue,
    source,
  ]);

  const discard = useCallback(() => {
    if (source && !window.confirm("Discard local draft?")) {
      return;
    }
    if (projectPath && pageId) {
      storage.remove(projectPath, pageId);
    }
    loadFromPage();
    setOpen(false);
  }, [loadFromPage, pageId, projectPath, source]);

  const restoreDraft = useCallback(() => {
    if (!pendingDraft) {
      return;
    }
    setSource(pendingDraft.source);
    setEditedGroupSettings(pendingDraft.editedGroupSettings);
    setDraftRevision(pendingDraft.draftRevision);
    setConflict("none");
    setStatus(`Draft restored ${pendingDraft.updatedAt}`);
  }, [pendingDraft]);

  const useSavedPage = useCallback(() => {
    loadFromPage();
  }, [loadFromPage]);

  useEffect(() => {
    setOpen(false);
  }, [pageId]);

  useEffect(() => {
    const flush = () => persist({ source, draftRevision });
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, [draftRevision, persist, source]);

  const parseLint = useCallback(
    (value: string) => {
      const page = getValues();
      if (page.type !== "comments") {
        return { errors: [] };
      }
      return parseZenCommentsPage(value, {
        aliases,
        insertedComments: page.comments,
        knownTtsIds: new Set(page.tts.map((item) => item.id)),
      });
    },
    [aliases, getValues],
  );

  return {
    open,
    source,
    setSource: updateSource,
    aliases,
    completionAliases,
    errors: parsed.errors,
    groupCount: parsed.groups.length,
    replyCount: parsed.groups.reduce((count, group) => count + group.replies.length, 0),
    canApply: parsed.errors.length === 0,
    close: () => setOpen(false),
    handleOpenChange,
    apply: () => void apply(),
    discard,
    restoreDraft,
    useSavedPage,
    conflict,
    status,
    localSaveOk,
    parseLint,
    insertedComments,
    openZen,
  };
}

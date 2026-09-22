import type { CommentGroup, CommentScene, NiconicoComment } from "@/_schemas/project/comments";
import type { CommentsPageFormValues } from "@/app/features/page/model/page-form-schema";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import { commentsEditFingerprint } from "@/app/features/comments/comment-operations";
import {
  createCommentScenesFromGroupIds,
  migratedCommentSceneId,
} from "@/server/features/project/comments-presentation";

const VERSION = 1 as const;

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type CommentsZenSnapshot = {
  title: string;
  tags: string[];
  niconico: CommentsPageFormValues["meta"]["niconico"];
  presentation: CommentsPageFormValues["meta"]["presentation"];
  comments: NiconicoComment[];
  commentGroups: CommentGroup[];
  commentScenes: CommentScene[];
  tts: TtsFormValues[];
};

export type CommentsZenDraft = {
  version: typeof VERSION;
  source: string;
  editedGroupSettings: Record<string, { displayText: string | null }>;
  updatedAt: string;
  draftRevision: number;
  baseFingerprint: string;
  baseSnapshot: CommentsZenSnapshot;
  targetFingerprint: string | null;
};

export function commentsZenStorageKey(projectPath: string, pageId: string) {
  return `zen-comments-draft:v1:${encodeURIComponent(projectPath)}:${pageId}`;
}

function cloneScenes(scenes: readonly CommentScene[]) {
  return scenes.map((scene) => ({
    ...scene,
    groupIds: [...scene.groupIds],
  }));
}

export function toCommentsZenSnapshot(page: CommentsPageFormValues): CommentsZenSnapshot {
  return {
    title: page.title,
    tags: [...page.meta.tags],
    niconico: page.meta.niconico,
    presentation: page.meta.presentation,
    comments: page.comments.map((comment) => ({ ...comment })),
    commentGroups: page.commentGroups.map((group) => ({
      ...group,
      commentIds: [...group.commentIds],
      ttsIds: [...group.ttsIds],
    })),
    commentScenes: cloneScenes(page.commentScenes),
    tts: page.tts.map((item) => ({
      ...item,
      speech: item.speech ? { ...item.speech } : {},
    })),
  };
}

function fingerprintFromSnapshot(snapshot: CommentsZenSnapshot) {
  return commentsEditFingerprint({
    id: "fingerprint",
    type: "comments",
    title: snapshot.title,
    padBeforeSec: 0,
    padAfterSec: 0,
    richText: null,
    meta: {
      tags: snapshot.tags,
      niconico: snapshot.niconico,
      presentation: snapshot.presentation ?? "single",
    },
    comments: snapshot.comments,
    commentGroups: snapshot.commentGroups,
    commentScenes: snapshot.commentScenes,
    tts: snapshot.tts,
  });
}

function legacyFingerprintFromSnapshot(
  snapshot: Omit<CommentsZenSnapshot, "commentScenes"> & { commentScenes?: CommentScene[] },
) {
  return JSON.stringify({
    title: snapshot.title,
    tags: snapshot.tags,
    niconico: snapshot.niconico,
    presentation: snapshot.presentation,
    comments: snapshot.comments,
    commentGroups: snapshot.commentGroups,
    tts: snapshot.tts.map(({ speech: _speech, ...rest }) => rest),
  });
}

export function snapshotFingerprint(snapshot: CommentsZenSnapshot) {
  return fingerprintFromSnapshot(snapshot);
}

export function migrateCommentsZenSnapshot(
  snapshot: Omit<CommentsZenSnapshot, "commentScenes"> & { commentScenes?: CommentScene[] },
): CommentsZenSnapshot {
  if (Array.isArray(snapshot.commentScenes)) {
    return {
      ...snapshot,
      commentScenes: cloneScenes(snapshot.commentScenes),
    };
  }
  const presentation = snapshot.presentation ?? "single";
  return {
    ...snapshot,
    commentScenes: createCommentScenesFromGroupIds(
      snapshot.commentGroups.map((group) => group.id),
      presentation,
      migratedCommentSceneId,
    ),
  };
}

function migrateCommentsZenDraft(draft: CommentsZenDraft): CommentsZenDraft {
  const hadScenes = Array.isArray(
    (draft.baseSnapshot as CommentsZenSnapshot & { commentScenes?: CommentScene[] }).commentScenes,
  );
  const migratedSnapshot = migrateCommentsZenSnapshot(draft.baseSnapshot);
  if (hadScenes) {
    return { ...draft, baseSnapshot: migratedSnapshot };
  }
  const legacy = legacyFingerprintFromSnapshot(draft.baseSnapshot);
  const nextFingerprint = fingerprintFromSnapshot(migratedSnapshot);
  return {
    ...draft,
    baseSnapshot: migratedSnapshot,
    baseFingerprint: draft.baseFingerprint === legacy ? nextFingerprint : draft.baseFingerprint,
    targetFingerprint:
      draft.targetFingerprint === legacy ? nextFingerprint : draft.targetFingerprint,
  };
}

function isDraft(value: unknown): value is CommentsZenDraft {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const draft = value as CommentsZenDraft;
  return (
    draft.version === VERSION &&
    typeof draft.source === "string" &&
    typeof draft.updatedAt === "string" &&
    typeof draft.draftRevision === "number" &&
    typeof draft.baseFingerprint === "string" &&
    typeof draft.baseSnapshot === "object" &&
    draft.baseSnapshot !== null
  );
}

export type ReadCommentsZenDraft =
  | { status: "missing" }
  | { status: "ok"; draft: CommentsZenDraft }
  | { status: "invalid"; raw: string };

export function createCommentsDraftStorage(
  getStorage: () => DraftStorage,
  onError: (message: string) => void,
) {
  const readRaw = (key: string) => {
    try {
      return getStorage().getItem(key);
    } catch {
      onError("Draft not saved locally");
      return null;
    }
  };

  return {
    read(projectPath: string, pageId: string): ReadCommentsZenDraft {
      const key = commentsZenStorageKey(projectPath, pageId);
      const raw = readRaw(key);
      if (raw === null) {
        return { status: "missing" };
      }
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!isDraft(parsed)) {
          return { status: "invalid", raw };
        }
        return { status: "ok", draft: migrateCommentsZenDraft(parsed) };
      } catch {
        return { status: "invalid", raw };
      }
    },
    write(projectPath: string, pageId: string, draft: CommentsZenDraft) {
      const key = commentsZenStorageKey(projectPath, pageId);
      try {
        getStorage().setItem(key, JSON.stringify(draft));
        return true;
      } catch {
        onError("Draft not saved locally");
        return false;
      }
    },
    remove(projectPath: string, pageId: string) {
      const key = commentsZenStorageKey(projectPath, pageId);
      try {
        getStorage().removeItem(key);
        return true;
      } catch {
        onError("Draft not saved locally");
        return false;
      }
    },
  };
}

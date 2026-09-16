import type { CommentGroup, NiconicoComment } from "@/_schemas/project/comments";
import type { CommentsPageFormValues } from "@/app/features/page/model/page-form-schema";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import { commentsEditFingerprint } from "@/app/features/comments/comment-operations";

const VERSION = 1 as const;

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type CommentsZenSnapshot = {
  title: string;
  tags: string[];
  niconico: CommentsPageFormValues["meta"]["niconico"];
  comments: NiconicoComment[];
  commentGroups: CommentGroup[];
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

export function toCommentsZenSnapshot(page: CommentsPageFormValues): CommentsZenSnapshot {
  return {
    title: page.title,
    tags: [...page.meta.tags],
    niconico: page.meta.niconico,
    comments: page.comments.map((comment) => ({ ...comment })),
    commentGroups: page.commentGroups.map((group) => ({
      ...group,
      commentIds: [...group.commentIds],
      ttsIds: [...group.ttsIds],
    })),
    tts: page.tts.map((item) => ({
      ...item,
      speech: item.speech ? { ...item.speech } : {},
    })),
  };
}

export function snapshotFingerprint(snapshot: CommentsZenSnapshot) {
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
    },
    comments: snapshot.comments,
    commentGroups: snapshot.commentGroups,
    tts: snapshot.tts,
  });
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
        return { status: "ok", draft: parsed };
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

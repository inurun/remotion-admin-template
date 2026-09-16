import type { NiconicoComment } from "@/_schemas/project/comments";
import type { CommentsPageFormValues } from "@/app/features/page/model/page-form-schema";
import {
  cloneCommentsPage,
  commentsStructureKey,
  insertCommentsAsGroups,
  mergeCommentSnapshot,
} from "@/app/features/comments/comment-operations";

export type CommentsSettingsApplyInput = {
  title: string;
  tags: string[];
  videoId: string | null;
  snapshot: NiconicoComment[] | null;
  fetchedAt: string | null;
  insertIds: readonly string[];
};

export type CommentsSettingsApplyResult =
  | { ok: true; page: CommentsPageFormValues }
  | { ok: false; reason: "conflict" | "video-switch" };

export function commentsPageNeedsVideoSwitch(
  page: CommentsPageFormValues,
  nextVideoId: string | null,
) {
  const currentId = page.meta.niconico?.videoId ?? null;
  if (nextVideoId === null || currentId === null || currentId === nextVideoId) {
    return false;
  }
  return page.commentGroups.length > 0 || page.tts.length > 0;
}

export function applyCommentsPageSettings(
  current: CommentsPageFormValues,
  openedStructureKey: string,
  input: CommentsSettingsApplyInput,
  options?: { confirmVideoSwitch?: boolean },
): CommentsSettingsApplyResult {
  if (commentsStructureKey(current) !== openedStructureKey) {
    return { ok: false, reason: "conflict" };
  }

  const nextVideoId = input.videoId;
  if (commentsPageNeedsVideoSwitch(current, nextVideoId) && !options?.confirmVideoSwitch) {
    return { ok: false, reason: "video-switch" };
  }

  let next = cloneCommentsPage(current);
  next.title = input.title;
  next.meta = {
    ...next.meta,
    tags: [...input.tags],
  };

  if (nextVideoId === null) {
    next.meta.niconico = null;
    next.comments = [];
    next.commentGroups = [];
    next.tts = [];
    return { ok: true, page: next };
  }

  const switching =
    (next.meta.niconico?.videoId ?? null) !== nextVideoId &&
    (next.commentGroups.length > 0 || next.tts.length > 0 || next.comments.length > 0);

  if (switching) {
    next.comments = [];
    next.commentGroups = [];
    next.tts = [];
  }

  if (input.snapshot) {
    next = mergeCommentSnapshot(next, input.snapshot);
    next.meta.niconico = {
      videoId: nextVideoId,
      fetchedAt: input.fetchedAt,
    };
  } else {
    next.meta.niconico = {
      videoId: nextVideoId,
      fetchedAt: switching ? null : (next.meta.niconico?.fetchedAt ?? null),
    };
  }

  if (input.insertIds.length > 0) {
    next = insertCommentsAsGroups(next, input.insertIds);
  }

  return { ok: true, page: next };
}

export function headerCheckboxState(insertableCount: number, selectedCount: number) {
  if (insertableCount === 0 || selectedCount === 0) {
    return "none" as const;
  }
  if (selectedCount >= insertableCount) {
    return "all" as const;
  }
  return "some" as const;
}

export function toggleAllUninserted(insertableIds: readonly string[], selected: Set<string>) {
  const next = new Set(selected);
  const allSelected = insertableIds.every((id) => next.has(id));
  if (allSelected) {
    for (const id of insertableIds) {
      next.delete(id);
    }
    return next;
  }
  for (const id of insertableIds) {
    next.add(id);
  }
  return next;
}

export function nextFetchSelection(input: {
  isFirstFetch: boolean;
  previousSelected: ReadonlySet<string>;
  previousCommentIds: ReadonlySet<string>;
  nextComments: readonly NiconicoComment[];
  insertedIds: ReadonlySet<string>;
}) {
  const insertable = input.nextComments.filter(
    (comment) => !input.insertedIds.has(comment.id) && !comment.hidden,
  );
  if (input.isFirstFetch) {
    return new Set(insertable.map((comment) => comment.id));
  }
  const next = new Set<string>();
  for (const comment of insertable) {
    if (input.previousSelected.has(comment.id)) {
      next.add(comment.id);
      continue;
    }
    if (!input.previousCommentIds.has(comment.id)) {
      next.add(comment.id);
    }
  }
  return next;
}

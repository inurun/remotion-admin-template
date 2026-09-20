import type {
  CommentsPageFormValues,
  PageFormValues,
} from "@/app/features/page/model/page-form-schema";

export type CommentsEditorGroup = {
  id: string;
  commentIds: string[];
  ttsIds: string[];
};

export type CommentsEditorComment = {
  id: string;
  vposMs: number;
};

export type CommentsEditorStructure = {
  groups: CommentsEditorGroup[];
  comments: CommentsEditorComment[];
  ttsIds: string[];
};

export function asCommentsPage(page: PageFormValues): CommentsPageFormValues | null {
  return page.type === "comments" ? page : null;
}

export function selectCommentsEditorStructure(
  page: PageFormValues,
): CommentsEditorStructure | null {
  if (page.type !== "comments") {
    return null;
  }
  return {
    groups: page.commentGroups.map((group) => ({
      id: group.id,
      commentIds: group.commentIds,
      ttsIds: group.ttsIds,
    })),
    comments: page.comments.map((comment) => ({
      id: comment.id,
      vposMs: comment.vposMs,
    })),
    ttsIds: page.tts.map((item) => item.id),
  };
}

export function commentsEditorStructureKey(structure: CommentsEditorStructure | null) {
  return JSON.stringify(structure);
}

export function isCommentsEditorTextField(name: string | undefined) {
  if (!name) {
    return false;
  }
  return (
    /^commentGroups\.\d+\.displayText$/u.test(name) ||
    /^comments\.\d+\.body$/u.test(name) ||
    /^tts\.\d+(?:\.|$)/u.test(name)
  );
}

export function indexById(ids: readonly string[]): Record<string, number> {
  const index: Record<string, number> = {};
  for (const [position, id] of ids.entries()) {
    if (id) {
      index[id] = position;
    }
  }
  return index;
}

export function commentsById(
  comments: readonly CommentsEditorComment[],
): Record<string, CommentsEditorComment> {
  const index: Record<string, CommentsEditorComment> = {};
  for (const comment of comments) {
    index[comment.id] = comment;
  }
  return index;
}

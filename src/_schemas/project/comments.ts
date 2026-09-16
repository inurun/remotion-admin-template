import { z } from "zod";

export const niconicoCommentSchema = z.object({
  id: z.string().min(1),
  threadId: z.string().min(1),
  fork: z.literal("main"),
  no: z.number().int().nonnegative(),
  body: z.string(),
  vposMs: z.number().int().nonnegative(),
  postedAt: z.iso.datetime({ offset: true }),
  hidden: z.boolean().default(false),
});

export const commentGroupSchema = z.object({
  id: z.string().min(1),
  commentIds: z.array(z.string().min(1)).min(1),
  displayText: z
    .string()
    .nullable()
    .refine((value) => value === null || value.trim().length > 0, {
      message: "displayText must be null or a non-blank string",
    }),
  ttsIds: z.array(z.string().min(1)),
});

export const commentsNiconicoRefSchema = z
  .object({
    videoId: z.string().min(1),
    fetchedAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .nullable();

export const commentsPageMetaSchema = z.object({
  tags: z.array(z.string().trim().min(1)).default([]),
  niconico: commentsNiconicoRefSchema,
});

export type NiconicoComment = z.infer<typeof niconicoCommentSchema>;
export type CommentGroup = z.infer<typeof commentGroupSchema>;
export type CommentsNiconicoRef = z.infer<typeof commentsNiconicoRefSchema>;
export type CommentsPageMeta = z.infer<typeof commentsPageMetaSchema>;

type CommentsPageRelationTts = {
  id: string;
  text: string;
  provider: string;
  voiceName?: string;
  voiceVersion?: string;
};

export type CommentsPageRelationInput = {
  meta: CommentsPageMeta;
  comments: NiconicoComment[];
  commentGroups: CommentGroup[];
  tts: CommentsPageRelationTts[];
};

function parseCommentSnapshotId(id: string) {
  const parts = id.split(":");
  if (parts.length !== 4) {
    return null;
  }
  const [videoId, threadId, fork, noText] = parts;
  if (!videoId || !threadId || fork !== "main" || !noText || !/^\d+$/u.test(noText)) {
    return null;
  }
  return { videoId, threadId, fork, no: Number(noText) };
}

function addUniqueIssue(
  ctx: z.RefinementCtx,
  seen: Set<string>,
  id: string,
  path: Array<string | number>,
  message: string,
) {
  if (seen.has(id)) {
    ctx.addIssue({ code: "custom", message, path });
    return;
  }
  seen.add(id);
}

export function refineCommentsPageRelations(page: CommentsPageRelationInput, ctx: z.RefinementCtx) {
  if (page.meta.niconico === null) {
    if (page.comments.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: "comments must be empty when niconico is null",
        path: ["comments"],
      });
    }
    if (page.commentGroups.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: "commentGroups must be empty when niconico is null",
        path: ["commentGroups"],
      });
    }
    if (page.tts.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: "tts must be empty when niconico is null",
        path: ["tts"],
      });
    }
  }

  const commentIds = new Set<string>();
  const commentsById = new Map<string, NiconicoComment>();
  for (const [index, comment] of page.comments.entries()) {
    addUniqueIssue(ctx, commentIds, comment.id, ["comments", index, "id"], "duplicate comment id");
    commentsById.set(comment.id, comment);

    if (page.meta.niconico === null) {
      continue;
    }

    const parsed = parseCommentSnapshotId(comment.id);
    if (
      !parsed ||
      parsed.videoId !== page.meta.niconico.videoId ||
      parsed.threadId !== comment.threadId ||
      parsed.fork !== comment.fork ||
      parsed.no !== comment.no
    ) {
      ctx.addIssue({
        code: "custom",
        message: "comment id must be videoId:threadId:fork:no and match the snapshot fields",
        path: ["comments", index, "id"],
      });
    }
  }

  const groupIds = new Set<string>();
  const assignedCommentIds = new Set<string>();
  const assignedTtsIds = new Set<string>();
  const ttsById = new Map(page.tts.map((item) => [item.id, item]));
  const ttsIds = new Set<string>();
  for (const [index, item] of page.tts.entries()) {
    addUniqueIssue(ctx, ttsIds, item.id, ["tts", index, "id"], "duplicate tts id");
  }

  for (const [groupIndex, group] of page.commentGroups.entries()) {
    addUniqueIssue(
      ctx,
      groupIds,
      group.id,
      ["commentGroups", groupIndex, "id"],
      "duplicate comment group id",
    );

    for (const [commentIndex, commentId] of group.commentIds.entries()) {
      const comment = commentsById.get(commentId);
      if (!comment) {
        ctx.addIssue({
          code: "custom",
          message: "commentGroups reference a missing comment",
          path: ["commentGroups", groupIndex, "commentIds", commentIndex],
        });
      } else if (comment.hidden) {
        ctx.addIssue({
          code: "custom",
          message: "hidden comments cannot be inserted",
          path: ["commentGroups", groupIndex, "commentIds", commentIndex],
        });
      }
      addUniqueIssue(
        ctx,
        assignedCommentIds,
        commentId,
        ["commentGroups", groupIndex, "commentIds", commentIndex],
        "comment belongs to multiple groups",
      );
    }

    for (const [ttsIndex, ttsId] of group.ttsIds.entries()) {
      if (!ttsById.has(ttsId)) {
        ctx.addIssue({
          code: "custom",
          message: "commentGroups reference a missing tts",
          path: ["commentGroups", groupIndex, "ttsIds", ttsIndex],
        });
      }
      addUniqueIssue(
        ctx,
        assignedTtsIds,
        ttsId,
        ["commentGroups", groupIndex, "ttsIds", ttsIndex],
        "tts belongs to multiple groups",
      );
    }
  }

  for (const [index, item] of page.tts.entries()) {
    if (!assignedTtsIds.has(item.id)) {
      ctx.addIssue({
        code: "custom",
        message: "tts must belong to exactly one comment group",
        path: ["tts", index, "id"],
      });
    }
  }
}

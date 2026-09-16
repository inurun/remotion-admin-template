import { z } from "zod";
import { voiceProviderSchema } from "@/_schemas/project/primitives";

export const DEFAULT_COMMENT_GROUP_MIN_DURATION_SEC = 3;

export const niconicoCommentSchema = z.object({
  id: z.string().min(1),
  threadId: z.string().min(1),
  fork: z.literal("main"),
  no: z.number().int().nonnegative(),
  body: z.string(),
  vposMs: z.number().int().nonnegative(),
  postedAt: z.iso.datetime({ offset: true }),
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
  readingTtsId: z.string().min(1).nullable(),
  ttsIds: z.array(z.string().min(1)),
  minDurationSec: z.number().positive().default(DEFAULT_COMMENT_GROUP_MIN_DURATION_SEC),
});

export const commentReaderSchema = z
  .object({
    provider: voiceProviderSchema,
    voiceName: z.string().min(1),
    voiceVersion: z.string().optional(),
  })
  .nullable();

export const commentsNiconicoRefSchema = z
  .object({
    videoId: z.string().min(1),
    fetchedAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .nullable();

export const commentsPageMetaSchema = z.object({
  tags: z.array(z.string().trim().min(1)).default([]),
  commentReader: commentReaderSchema,
  niconico: commentsNiconicoRefSchema,
});

export type NiconicoComment = z.infer<typeof niconicoCommentSchema>;
export type CommentGroup = z.infer<typeof commentGroupSchema>;
export type CommentReader = z.infer<typeof commentReaderSchema>;
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

function voiceKey(voice: { provider: string; voiceName?: string; voiceVersion?: string }) {
  return `${voice.provider}::${voice.voiceName ?? ""}::${voice.voiceVersion ?? ""}`;
}

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
      if (!commentsById.has(commentId)) {
        ctx.addIssue({
          code: "custom",
          message: "commentGroups reference a missing comment",
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

    const membershipIds = [
      ...(group.readingTtsId ? [{ id: group.readingTtsId, path: "readingTtsId" as const }] : []),
      ...group.ttsIds.map((id, index) => ({ id, path: ["ttsIds", index] as const })),
    ];
    for (const membership of membershipIds) {
      if (!ttsById.has(membership.id)) {
        ctx.addIssue({
          code: "custom",
          message: "commentGroups reference a missing tts",
          path: ["commentGroups", groupIndex, membership.path].flat(),
        });
      }
      addUniqueIssue(
        ctx,
        assignedTtsIds,
        membership.id,
        ["commentGroups", groupIndex, membership.path].flat(),
        "tts belongs to multiple groups or both reading and replies",
      );
    }

    if (page.meta.commentReader === null) {
      if (group.readingTtsId !== null) {
        ctx.addIssue({
          code: "custom",
          message: "readingTtsId must be null when comment reader is off",
          path: ["commentGroups", groupIndex, "readingTtsId"],
        });
      }
      continue;
    }

    if (group.readingTtsId === null) {
      ctx.addIssue({
        code: "custom",
        message: "readingTtsId is required when comment reader is on",
        path: ["commentGroups", groupIndex, "readingTtsId"],
      });
      continue;
    }

    const reading = ttsById.get(group.readingTtsId);
    const firstComment = commentsById.get(group.commentIds[0] ?? "");
    const expectedText = group.displayText ?? firstComment?.body ?? "";
    if (!reading) {
      continue;
    }
    if (reading.text !== expectedText) {
      ctx.addIssue({
        code: "custom",
        message: "reading tts text must match the group display text",
        path: ["commentGroups", groupIndex, "readingTtsId"],
      });
    }
    if (voiceKey(reading) !== voiceKey(page.meta.commentReader)) {
      ctx.addIssue({
        code: "custom",
        message: "reading tts voice must match the page comment reader",
        path: ["commentGroups", groupIndex, "readingTtsId"],
      });
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

import { z } from "zod";
import { niconicoCommentSchema } from "@/_schemas/project/comments";

export const niconicoCommentsRequestSchema = z.object({
  source: z.string().trim().min(1),
});

export const niconicoCommentsResponseSchema = z.object({
  videoId: z.string().min(1),
  fetchedAt: z.iso.datetime({ offset: true }),
  comments: z.array(niconicoCommentSchema),
});

const threadIdSchema = z.union([z.string(), z.number()]).transform((value) => String(value));

export const nvCommentTargetSchema = z.object({
  id: threadIdSchema,
  fork: z.string().min(1),
});

export const nvCommentSchema = z.object({
  server: z.string().min(1),
  threadKey: z.string().min(1),
  params: z.object({
    targets: z.array(nvCommentTargetSchema).min(1),
    language: z.string().min(1),
  }),
});

export const watchServerResponseSchema = z.object({
  data: z.object({
    response: z.object({
      comment: z.object({
        nvComment: nvCommentSchema,
      }),
    }),
  }),
});

export const nvCommentThreadCommentSchema = z.object({
  no: z.number().int(),
  body: z.string(),
  vposMs: z.number(),
  postedAt: z.string().min(1),
});

export const nvCommentThreadSchema = z.object({
  id: threadIdSchema,
  fork: z.string().min(1),
  comments: z.array(nvCommentThreadCommentSchema).default([]),
});

export const nvCommentThreadsResponseSchema = z.object({
  meta: z.object({
    status: z.number(),
  }),
  data: z.object({
    threads: z.array(nvCommentThreadSchema).default([]),
  }),
});

export type NiconicoCommentsRequest = z.infer<typeof niconicoCommentsRequestSchema>;
export type NiconicoCommentsResponse = z.infer<typeof niconicoCommentsResponseSchema>;
export type NvComment = z.infer<typeof nvCommentSchema>;

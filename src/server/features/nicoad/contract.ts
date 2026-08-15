import { z } from "zod";

export const nicoadRequestSchema = z.object({
  source: z.string().trim().min(1),
});

export const nicoadAdvertiserSchema = z.object({
  name: z.string(),
  message: z.string(),
});

export const nicoadResponseSchema = z.object({
  videoId: z.string().min(1),
  advertisers: z.array(nicoadAdvertiserSchema),
});

export const nicoadHistoryItemSchema = z.object({
  advertiserName: z.string().default(""),
  message: z.string().optional().default(""),
  userId: z.number().optional(),
});

export const nicoadThanksResponseSchema = z.object({
  meta: z.object({
    status: z.number(),
  }),
  data: z.object({
    sponsors: z.array(nicoadHistoryItemSchema).default([]),
  }),
});

export type NicoadHistoryItem = z.infer<typeof nicoadHistoryItemSchema>;

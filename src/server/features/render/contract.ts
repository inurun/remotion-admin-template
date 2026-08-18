import { z } from "zod";

export const renderSnapshotSchema = z.object({
  status: z.enum(["idle", "running", "success", "error", "canceled"]),
  progress: z.number().int().min(0).max(100),
  videoPath: z.string().nullable(),
  updatedAt: z.number(),
  lastError: z.string().nullable(),
});

export const renderStartRequestSchema = z.object({
  projectPath: z.string().min(1),
});

export const renderStartResponseSchema = z.object({
  started: z.boolean(),
  reason: z.string().optional(),
  error: z.string().optional(),
});

export const renderCancelResponseSchema = z.object({
  canceled: z.boolean(),
  reason: z.string().optional(),
});

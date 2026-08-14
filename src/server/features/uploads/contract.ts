import { z } from "zod";

export const imageUploadResponseSchema = z.object({
  src: z.string().min(1),
});

export const videoUploadResponseSchema = z.object({
  src: z.string().min(1),
});

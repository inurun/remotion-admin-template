import { ogpMetadataSchema } from "@/_schemas";
import { z } from "zod";

export const ogpRequestSchema = z.object({
  url: z.string().url(),
});

export const ogpResponseSchema = ogpMetadataSchema;

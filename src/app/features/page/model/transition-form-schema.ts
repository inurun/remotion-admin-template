import { z } from "zod";
import { transitionVariantSchema } from "@/_schemas/project/primitives";

export const transitionFormSchema = z.object({
  id: z.string().min(1),
  type: z.literal("transition"),
  variant: transitionVariantSchema,
});

export type TransitionFormValues = z.infer<typeof transitionFormSchema>;

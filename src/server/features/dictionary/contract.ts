import { z } from "zod";
import {
  dictionaryEntryInputSchema,
  dictionaryListResponseSchema,
  dictionaryMutationResponseSchema,
  g2pItemSchema,
} from "@/_schemas";

export const dictionaryContract = {
  list: { response: dictionaryListResponseSchema },
  get: { response: dictionaryMutationResponseSchema },
  create: { json: dictionaryEntryInputSchema, response: dictionaryMutationResponseSchema },
  update: { json: dictionaryEntryInputSchema, response: dictionaryMutationResponseSchema },
  preview: { json: z.object({ g2p: g2pItemSchema }) },
};

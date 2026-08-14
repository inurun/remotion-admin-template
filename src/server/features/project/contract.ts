import {
  copyProjectRequestSchema,
  createProjectRequestSchema,
  draftProjectSchema,
  projectFileSummarySchema,
  savedProjectSchema,
} from "@/_schemas";

export const projectContract = {
  list: {
    response: projectFileSummarySchema.array(),
  },
  create: {
    json: createProjectRequestSchema,
    response: projectFileSummarySchema,
  },
  copy: {
    json: copyProjectRequestSchema,
    response: projectFileSummarySchema,
  },
  get: {
    response: savedProjectSchema,
  },
  save: {
    json: draftProjectSchema,
    response: savedProjectSchema,
  },
};

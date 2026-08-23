import { z } from "zod";

export const saveScheduleItemSchema = z
  .object({
    id: z.string().min(1),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    title: z.string().min(1),
    description: z.string(),
  })
  .refine((item) => item.endDate >= item.startDate, { path: ["endDate"] });

export const saveSchedulesSchema = z.object({
  items: z.array(saveScheduleItemSchema),
});

export const scheduleContract = {
  load: {
    response: saveSchedulesSchema,
  },
  save: {
    json: saveSchedulesSchema,
    response: saveSchedulesSchema,
  },
};

export type SaveScheduleItem = z.infer<typeof saveScheduleItemSchema>;
export type SaveSchedules = z.infer<typeof saveSchedulesSchema>;

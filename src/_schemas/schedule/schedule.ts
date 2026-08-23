import { z } from "zod";

export const savedScheduleItemSchema = z
  .object({
    id: z.string().min(1),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    title: z.string().min(1),
    description: z.string(),
  })
  .refine((item) => item.endDate >= item.startDate, { path: ["endDate"] });

export const savedSchedulesSchema = z.object({
  items: z.array(savedScheduleItemSchema).default([]),
});

export type SavedScheduleItem = z.infer<typeof savedScheduleItemSchema>;
export type SavedSchedules = z.infer<typeof savedSchedulesSchema>;

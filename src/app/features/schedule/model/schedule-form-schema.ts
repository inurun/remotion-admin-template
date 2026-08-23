import { z } from "zod";

export const scheduleFormSchema = z
  .object({
    id: z.string().min(1).optional(),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    title: z.string().min(1),
    description: z.string(),
  })
  .refine((item) => item.endDate >= item.startDate, { path: ["endDate"] });

export type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

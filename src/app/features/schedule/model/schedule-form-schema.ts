import { z } from "zod";

export const scheduleFormSchema = z.object({
  id: z.string().min(1).optional(),
  date: z.iso.date(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  title: z.string().min(1),
  description: z.string(),
});

export type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

import { createContext, useContext, useMemo } from "react";
import type { SavedScheduleItem } from "@/_schemas";
import type { ScheduleFormValues } from "@/app/features/schedule";

export type ScheduleCalendarContextValue = {
  itemsByDate: Record<string, SavedScheduleItem[]>;
  pending: boolean;
  onUpsert: (values: ScheduleFormValues) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
};

export const ScheduleCalendarContext = createContext<ScheduleCalendarContextValue | null>(null);

export function useScheduleCalendarProviderValue({
  itemsByDate,
  pending,
  onUpsert,
  onRemove,
}: ScheduleCalendarContextValue) {
  return useMemo(
    () => ({ itemsByDate, pending, onUpsert, onRemove }),
    [itemsByDate, onRemove, onUpsert, pending],
  );
}

export function useScheduleCalendar() {
  const context = useContext(ScheduleCalendarContext);
  if (!context) {
    throw new Error("ScheduleCalendar is missing");
  }
  return context;
}

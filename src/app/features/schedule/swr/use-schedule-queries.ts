import { toast } from "sonner";
import useSWR from "swr";
import type { SavedSchedules } from "@/_schemas";
import {
  fetchSchedules,
  saveSchedules,
  scheduleKeys,
} from "@/app/features/schedule/api/schedule-api";
import { emptySchedules } from "@/app/features/schedule/lib/schedule";

export function useSchedulesQuery() {
  const { data, mutate, isLoading } = useSWR(scheduleKeys.all(), fetchSchedules, {
    revalidateOnFocus: false,
    onError(err, key, config) {
      console.error(err, key, config);
      toast.error("Schedules loading failed");
    },
  });

  return {
    schedules: data ?? emptySchedules(),
    hasData: Boolean(data),
    isLoading,
    saveSchedules: async (schedules: SavedSchedules) => {
      const next = await saveSchedules(schedules);
      await mutate(next, { revalidate: false });
      return next;
    },
    reloadSchedules: async () => {
      await mutate();
    },
  };
}

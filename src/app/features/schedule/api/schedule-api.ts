import type { SavedSchedules } from "@/_schemas";
import { api } from "@/_shared/lib/api-client";
import { parseApiJson } from "@/_shared/lib/fetch-json";

export const scheduleKeys = {
  all: () => ["schedules"] as const,
};

export async function fetchSchedules() {
  return parseApiJson<SavedSchedules>(await api.schedules.$get());
}

export async function saveSchedules(schedules: SavedSchedules) {
  return parseApiJson<SavedSchedules>(
    await api.schedules.$put({
      json: schedules,
    }),
  );
}

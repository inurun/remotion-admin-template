import { readSavedSchedules, writeSavedSchedules } from "@/server/_shared/storage";
import { saveSchedulesSchema, type SaveSchedules } from "./contract";

export async function loadSchedules() {
  return saveSchedulesSchema.parse(await readSavedSchedules());
}

export async function saveSchedules(schedules: SaveSchedules) {
  const parsed = saveSchedulesSchema.parse(schedules);
  await writeSavedSchedules(parsed);
  return parsed;
}

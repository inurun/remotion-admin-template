import type { ProjectFileSummary } from "@/server/features/project/contract";

export function useDirectory({
  directoryName,
  directoryPath,
  items,
  selectedProjectPath,
}: {
  directoryName: string;
  directoryPath: string;
  items: ProjectFileSummary[];
  selectedProjectPath: string | null;
}) {
  return {
    accordionValue: directoryPath || "root",
    directoryName,
    items,
    selectedProjectPath,
  };
}

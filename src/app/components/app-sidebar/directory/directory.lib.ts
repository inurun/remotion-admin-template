import type { ProjectFileSummary } from "@/_schemas";

export function getDirectoryPath(project: ProjectFileSummary) {
  return project.segments.slice(0, -1).join("/");
}

export function getDirectoryName(directoryPath: string) {
  if (!directoryPath) {
    return "Root";
  }

  const segments = directoryPath.split("/");
  return segments[segments.length - 1] ?? "Root";
}

export function groupProjectsByDirectory(projects: ProjectFileSummary[]) {
  const groups = new Map<string, ProjectFileSummary[]>();

  for (const project of projects) {
    const directoryPath = getDirectoryPath(project);
    const current = groups.get(directoryPath) ?? [];
    current.push(project);
    groups.set(directoryPath, current);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([directoryPath, items]) => ({
      directoryPath,
      directoryName: getDirectoryName(directoryPath),
      items: [...items].sort((left, right) => right.updatedAt - left.updatedAt),
    }));
}

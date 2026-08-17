export function getProjectFileStem(projectPath: string) {
  return projectPath.split("/").filter(Boolean).at(-1) ?? "project";
}

export function getProjectOutputVideoFileName(projectPath: string) {
  return `${getProjectFileStem(projectPath)}.mp4`;
}

function encodeProjectPathForUrl(projectPath: string) {
  return projectPath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function getProjectHref(projectPath: string) {
  return `/projects/${encodeURIComponent(projectPath)}`;
}

export function encodeProjectPathParam(projectPath: string) {
  return encodeProjectPathForUrl(projectPath);
}

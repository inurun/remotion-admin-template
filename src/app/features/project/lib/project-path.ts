function encodeProjectPathForUrl(projectPath: string) {
  return projectPath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function getProjectHref(projectPath: string) {
  return `/${encodeProjectPathForUrl(projectPath)}`;
}

export function getProjectPathFromLocation(pathname: string) {
  const normalizedPath = pathname.replace(/^\/+|\/+$/g, "");
  return normalizedPath ? decodeURIComponent(normalizedPath) : null;
}

export function encodeProjectPathParam(projectPath: string) {
  return encodeProjectPathForUrl(projectPath);
}

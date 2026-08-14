function normalizeNewlines(value: string) {
  return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

export function applyVoisonaTextTransforms(text: string) {
  const normalized = normalizeNewlines(text).trim();
  if (!normalized) {
    return "";
  }

  return normalized
    .split(/\n+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => segment.replace(/。+$/u, ""))
    .filter(Boolean)
    .join("。");
}

export function getVoisonaReadText(text: string, readText?: string) {
  const trimmedReadText = readText?.trim();
  if (trimmedReadText) {
    return applyVoisonaTextTransforms(trimmedReadText);
  }

  return applyVoisonaTextTransforms(text);
}

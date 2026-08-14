/** `#tag` without space after `#`. */
export const TAG_TOKEN_PATTERN = /^#([^\s#]+)$/;

export function extractInlineTags(text: string): { title: string; tags: string[] } {
  const tags: string[] = [];
  const titleParts: string[] = [];

  for (const token of text.split(/\s+/).filter(Boolean)) {
    const match = token.match(TAG_TOKEN_PATTERN);
    if (match) {
      tags.push(match[1]);
      continue;
    }
    titleParts.push(token);
  }

  return {
    title: titleParts.join(" "),
    tags,
  };
}

export function uniqueTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    if (seen.has(tag)) {
      continue;
    }
    seen.add(tag);
    result.push(tag);
  }
  return result;
}

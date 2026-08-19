const TRAILING_BR_PATTERN = /<br\s*\/?>$/i;

function normalizeLineBreakTag(line: string) {
  return line.replace(/\s*<br\s*\/?>\s*$/i, "<br>");
}

export function toNiconicoDescriptionHtml(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) =>
      TRAILING_BR_PATTERN.test(line.trimEnd()) ? normalizeLineBreakTag(line) : `${line}<br>`,
    )
    .join("");
}

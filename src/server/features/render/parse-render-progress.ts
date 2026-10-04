export function stripAnsi(text: string) {
  const ansiEscape = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`, "g");
  return text.replace(ansiEscape, "");
}

/** `hyperframes render` progress bar line: `  ████░░░░  42%  Capturing frame 120/300`. */
const HF_PROGRESS_LINE = /[█░]+\s+(\d+(?:\.\d+)?)%/;

/** Overall percent (0–100) of a `hyperframes render` output line, or null. */
export function parseRenderProgress(line: string): number | null {
  const match = stripAnsi(line).match(HF_PROGRESS_LINE);
  if (!match) {
    return null;
  }
  return Math.min(100, Math.max(0, Math.round(Number(match[1]))));
}

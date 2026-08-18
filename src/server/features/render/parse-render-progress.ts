export function stripAnsi(text: string) {
  const ansiEscape = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`, "g");
  return text.replace(ansiEscape, "");
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function parseFrameRatio(line: string, label: RegExp) {
  const match = line.match(label);
  if (!match) {
    return null;
  }

  const current = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) {
    return null;
  }

  return current / total;
}

export function parseRenderProgress(line: string): number | null {
  const cleaned = stripAnsi(line).replaceAll("\r", "").trim();
  if (!cleaned) {
    return null;
  }

  const bundling = cleaned.match(/bundl(?:ing|ed)\s+(\d+(?:\.\d+)?)%/i);
  if (bundling) {
    return clampPercent((Number(bundling[1]) / 100) * 5);
  }

  const rendered = parseFrameRatio(cleaned, /rendered\s+(\d+)\s*\/\s*(\d+)/i);
  if (rendered !== null) {
    return clampPercent(5 + rendered * 80);
  }

  const encoded = parseFrameRatio(cleaned, /encoded\s+(\d+)\s*\/\s*(\d+)/i);
  if (encoded !== null) {
    return clampPercent(85 + encoded * 15);
  }

  const percent = cleaned.match(/(\d+(?:\.\d+)?)%/);
  if (percent) {
    return clampPercent(Number(percent[1]));
  }

  return null;
}

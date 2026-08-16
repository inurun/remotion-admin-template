const HAQUMEI_MAX_BATCH_SIZE = 256;
const HAQUMEI_MAX_TEXT_CHARS = 500;
const HAQUMEI_MAX_TOTAL_CHARS = 32_000;

function unicodeScalarCount(text: string) {
  return [...text].length;
}

export function assertHaqumeiTextLength(text: string, ttsId?: string) {
  const count = unicodeScalarCount(text);
  if (count <= HAQUMEI_MAX_TEXT_CHARS) {
    return;
  }

  const suffix = ttsId ? ` for tts ${ttsId}` : "";
  throw new Error(`text exceeds ${HAQUMEI_MAX_TEXT_CHARS} characters${suffix} (${count})`);
}

export function chunkAnalyzeTexts(texts: string[]) {
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentScalars = 0;

  for (const text of texts) {
    const count = unicodeScalarCount(text);
    const exceedsCount = current.length >= HAQUMEI_MAX_BATCH_SIZE;
    const exceedsScalars = current.length > 0 && currentScalars + count > HAQUMEI_MAX_TOTAL_CHARS;
    if (exceedsCount || exceedsScalars) {
      chunks.push(current);
      current = [];
      currentScalars = 0;
    }

    current.push(text);
    currentScalars += count;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

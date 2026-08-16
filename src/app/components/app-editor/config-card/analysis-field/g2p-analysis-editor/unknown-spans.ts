import type { G2pItem, G2pSourceSpan } from "@/_schemas";

export function getUnknownSourceSpans(item: G2pItem): G2pSourceSpan[] {
  return mergeSourceSpans(
    item.warnings.flatMap((warning) => {
      if (warning.code !== "unknown_word" || warning.source_span == null) {
        return [];
      }

      return [warning.source_span];
    }),
  );
}

export function mergeSourceSpans(spans: G2pSourceSpan[]): G2pSourceSpan[] {
  const sorted = [...spans].sort((left, right) => left.start_utf16 - right.start_utf16);
  const merged: G2pSourceSpan[] = [];

  for (const span of sorted) {
    const last = merged.at(-1);
    if (!last || span.start_utf16 > last.end_utf16) {
      merged.push({ ...span });
      continue;
    }

    last.end_utf16 = Math.max(last.end_utf16, span.end_utf16);
  }

  return merged;
}

export function getWarningsWithoutSourceSpan(item: G2pItem) {
  return item.warnings.filter((warning) => warning.source_span == null);
}

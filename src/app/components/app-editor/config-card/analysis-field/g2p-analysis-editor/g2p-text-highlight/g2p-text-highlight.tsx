import type { G2pSourceSpan } from "@/_schemas";
import { DictionarySelectionPopover } from "./dictionary-selection-popover/dictionary-selection-popover";

function getHighlightParts(text: string, spans: G2pSourceSpan[]) {
  const parts: Array<{ key: string; text: string; marked: boolean }> = [];
  let cursor = 0;

  for (const [index, span] of spans.entries()) {
    if (span.start_utf16 > cursor) {
      parts.push({
        key: `plain-${index}-${cursor}`,
        text: text.slice(cursor, span.start_utf16),
        marked: false,
      });
    }

    parts.push({
      key: `mark-${index}-${span.start_utf16}`,
      text: text.slice(span.start_utf16, span.end_utf16),
      marked: true,
    });
    cursor = span.end_utf16;
  }

  if (cursor < text.length) {
    parts.push({
      key: `plain-end-${cursor}`,
      text: text.slice(cursor),
      marked: false,
    });
  }

  return parts;
}

export function G2pTextHighlight({ spans, text }: { spans: G2pSourceSpan[]; text: string }) {
  return (
    <DictionarySelectionPopover>
      <p className="text-sm text-muted-foreground">
        {spans.length === 0
          ? text
          : getHighlightParts(text, spans).map((part) =>
              part.marked ? (
                <mark key={part.key} className="rounded-sm bg-destructive/20 text-foreground">
                  {part.text}
                </mark>
              ) : (
                <span key={part.key}>{part.text}</span>
              ),
            )}
      </p>
    </DictionarySelectionPopover>
  );
}

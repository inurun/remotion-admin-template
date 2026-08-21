import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/_shared/lib/error-message";
import { splitKanaMoras } from "@/_shared/lib/kana-mora";
import { createDictionaryEntry } from "@/app/features/dictionary";
import type { DictionaryEntryInput } from "@/_schemas";

type SelectionState = { surface: string };

export function createSelectedWordEntry(
  surface: string,
  reading: string,
  accent: number,
): DictionaryEntryInput {
  return {
    kind: "fixed",
    surface,
    reading: reading.trim(),
    pronunciation: null,
    accent_nucleus: accent,
    part_of_speech: "common_noun",
    enabled: true,
  };
}

export function useDictionarySelectionPopover() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [reading, setReading] = useState("");
  const [accent, setAccent] = useState(0);
  const [pending, setPending] = useState(false);

  const selectText = useCallback(() => {
    const selected = window.getSelection();
    if (!selected || selected.isCollapsed || selected.rangeCount === 0) {
      setSelection(null);
      return;
    }
    const range = selected.getRangeAt(0);
    if (!containerRef.current?.contains(range.commonAncestorContainer)) return;
    const surface = selected.toString().trim();
    if (!surface) return;
    setSelection({ surface });
    setReading("");
    setAccent(0);
  }, []);

  const updateReading = useCallback((value: string) => {
    setReading(value);
    setAccent((current) => Math.min(current, splitKanaMoras(value).length));
  }, []);

  const save = useCallback(async () => {
    if (!selection || !reading.trim()) return;
    setPending(true);
    try {
      await createDictionaryEntry(createSelectedWordEntry(selection.surface, reading, accent));
      toast.success(`${selection.surface} を辞書へ登録した`);
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      toast.error(getErrorMessage(error, "Dictionary registration failed"));
    } finally {
      setPending(false);
    }
  }, [accent, reading, selection]);

  return {
    containerRef,
    selection,
    reading,
    accent,
    moras: splitKanaMoras(reading),
    pending,
    selectText,
    updateReading,
    setAccent,
    close: () => setSelection(null),
    save,
  };
}

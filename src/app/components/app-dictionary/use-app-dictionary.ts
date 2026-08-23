import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { DictionaryEntry, DictionaryEntryInput, G2pItem } from "@/_schemas";
import { dictionaryEntryInputSchema } from "@/_schemas";
import {
  analyzeDictionaryText,
  createDictionaryDraft,
  createDictionaryEntry,
  deleteDictionaryEntry,
  entryToInput,
  getDefaultPreviewText,
  normalizeDictionaryInput,
  requestDictionaryPreview,
  updateDictionaryEntry,
  useDictionaryQuery,
} from "@/app/features/dictionary";

export type DictionaryKind = DictionaryEntryInput["kind"];

export function filterDictionaryEntries(
  entries: DictionaryEntry[],
  kind: DictionaryKind,
  query: string,
) {
  const needle = query.trim().toLocaleLowerCase();
  return entries.filter(
    (entry) =>
      entry.kind === kind && (!needle || entry.surface.toLocaleLowerCase().includes(needle)),
  );
}

export function pickEntryForKind(entries: DictionaryEntry[], kind: DictionaryKind) {
  return entries.find((entry) => entry.kind === kind) ?? null;
}

export function shouldReplaceDraftForKind(
  draft: DictionaryEntryInput | null,
  kind: DictionaryKind,
) {
  return !draft || draft.kind !== kind;
}

export function useAppDictionary() {
  const { dictionary, isLoading, reload } = useDictionaryQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<DictionaryEntryInput | null>(null);
  const [savedDraft, setSavedDraft] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKindState] = useState<DictionaryKind>("fixed");
  const [previewText, setPreviewText] = useState("");
  const [analysis, setAnalysis] = useState<G2pItem | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const audioUrlRef = useRef<string | null>(null);

  const dirty = Boolean(draft && JSON.stringify(draft) !== savedDraft);
  const filteredEntries = useMemo(
    () => filterDictionaryEntries(dictionary.entries, kind, query),
    [dictionary.entries, kind, query],
  );

  const loadDraft = useCallback(
    (next: DictionaryEntryInput, id: number | null, preview?: string) => {
      const copy = structuredClone(next);
      setSelectedId(id);
      setDraft(copy);
      setSavedDraft(JSON.stringify(copy));
      setPreviewText(preview ?? getDefaultPreviewText(copy));
      setAnalysis(null);
      setError("");
    },
    [],
  );

  const clearDraft = useCallback(() => {
    setSelectedId(null);
    setDraft(null);
    setSavedDraft("");
    setAnalysis(null);
    setError("");
  }, []);

  const loadKindDraft = useCallback(
    (nextKind: DictionaryKind) => {
      const entry = pickEntryForKind(dictionary.entries, nextKind);
      if (entry) loadDraft(entryToInput(entry), entry.id);
      else clearDraft();
    },
    [clearDraft, dictionary.entries, loadDraft],
  );

  useEffect(() => {
    if (!draft) loadKindDraft(kind);
  }, [dictionary.entries, draft, kind, loadKindDraft]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(
    () => () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    },
    [],
  );

  const canDiscard = useCallback(
    () => !dirty || window.confirm("Discard unsaved changes?"),
    [dirty],
  );

  const setKind = useCallback(
    (next: DictionaryKind) => {
      if (next === kind) return;
      if (!canDiscard()) return;
      setKindState(next);
      if (shouldReplaceDraftForKind(draft, next)) loadKindDraft(next);
    },
    [canDiscard, draft, kind, loadKindDraft],
  );

  const select = useCallback(
    (id: number) => {
      if (id === selectedId || !canDiscard()) return;
      const entry = dictionary.entries.find((item) => item.id === id);
      if (entry) loadDraft(entryToInput(entry), id);
    },
    [canDiscard, dictionary.entries, loadDraft, selectedId],
  );

  const add = useCallback(
    (nextKind: DictionaryKind) => {
      if (canDiscard()) loadDraft(createDictionaryDraft(nextKind), null);
    },
    [canDiscard, loadDraft],
  );

  const save = useCallback(
    async (preview?: string) => {
      if (!draft) throw new Error("Select an entry");
      const normalized = normalizeDictionaryInput(draft);
      const parsed = dictionaryEntryInputSchema.safeParse(normalized);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid entry");
      const result = selectedId
        ? await updateDictionaryEntry(selectedId, parsed.data)
        : await createDictionaryEntry(parsed.data);
      loadDraft(entryToInput(result.entry), result.entry.id, preview);
      await reload();
      toast.success("Dictionary saved");
      return result.entry;
    },
    [draft, loadDraft, reload, selectedId],
  );

  const run = useCallback(async (action: () => Promise<void>) => {
    setPending(true);
    setError("");
    try {
      await action();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Dictionary operation failed";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }, []);

  const saveOnly = useCallback(() => run(async () => void (await save())), [run, save]);

  const saveAndPreview = useCallback(
    () =>
      run(async () => {
        const text = previewText.trim();
        if (!text) throw new Error("Enter preview text");
        await save(previewText);
        const g2p = await analyzeDictionaryText(text);
        setAnalysis(g2p);
        const wav = await requestDictionaryPreview(g2p);
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        const url = URL.createObjectURL(wav);
        audioUrlRef.current = url;
        await new Audio(url).play();
      }),
    [previewText, run, save],
  );

  const remove = useCallback(
    () =>
      run(async () => {
        if (!selectedId || !window.confirm("Delete this dictionary entry?")) return;
        await deleteDictionaryEntry(selectedId);
        clearDraft();
        await reload();
        toast.success("Dictionary entry deleted");
      }),
    [clearDraft, reload, run, selectedId],
  );

  const toggleEntry = useCallback(
    (entry: DictionaryEntry, enabled: boolean) =>
      run(async () => {
        const result = await updateDictionaryEntry(entry.id, {
          ...entryToInput(entry),
          enabled,
        });
        if (selectedId === entry.id) {
          setDraft((current) => (current ? { ...current, enabled } : current));
          setSavedDraft(JSON.stringify(entryToInput(result.entry)));
        }
        await reload();
      }),
    [reload, run, selectedId],
  );

  const removeEntry = useCallback(
    (id: number) =>
      run(async () => {
        await deleteDictionaryEntry(id);
        if (selectedId === id) clearDraft();
        await reload();
        toast.success("Dictionary entry deleted");
      }),
    [clearDraft, reload, run, selectedId],
  );

  return {
    dictionary,
    isLoading,
    filteredEntries,
    selectedId,
    draft,
    setDraft,
    query,
    setQuery,
    kind,
    setKind,
    previewText,
    setPreviewText,
    analysis,
    pending,
    dirty,
    error,
    select,
    add,
    saveOnly,
    saveAndPreview,
    remove,
    toggleEntry,
    removeEntry,
  };
}

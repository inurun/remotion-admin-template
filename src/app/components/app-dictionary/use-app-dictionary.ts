import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { DictionaryEntryInput, G2pItem } from "@/_schemas";
import { dictionaryEntryInputSchema } from "@/_schemas";
import {
  analyzeDictionaryText,
  createDictionaryDraft,
  createDictionaryEntry,
  deleteDictionaryEntry,
  entryToInput,
  findSelectedCandidate,
  getDefaultPreviewText,
  normalizeDictionaryInput,
  requestDictionaryPreview,
  updateDictionaryEntry,
  useDictionaryQuery,
} from "@/app/features/dictionary";

export function useAppDictionary() {
  const { dictionary, isLoading, reload } = useDictionaryQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<DictionaryEntryInput | null>(null);
  const [savedDraft, setSavedDraft] = useState("");
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | DictionaryEntryInput["kind"]>("all");
  const [previewText, setPreviewText] = useState("");
  const [analysis, setAnalysis] = useState<G2pItem | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const audioUrlRef = useRef<string | null>(null);

  const dirty = Boolean(draft && JSON.stringify(draft) !== savedDraft);
  const filteredEntries = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return dictionary.entries.filter(
      (entry) =>
        (kindFilter === "all" || entry.kind === kindFilter) &&
        (!needle || entry.surface.toLocaleLowerCase().includes(needle)),
    );
  }, [dictionary.entries, kindFilter, query]);

  const loadDraft = useCallback((next: DictionaryEntryInput, id: number | null) => {
    const copy = structuredClone(next);
    setSelectedId(id);
    setDraft(copy);
    setSavedDraft(JSON.stringify(copy));
    setPreviewText(getDefaultPreviewText(copy));
    setAnalysis(null);
    setError("");
  }, []);

  useEffect(() => {
    if (!draft && dictionary.entries[0]) {
      loadDraft(entryToInput(dictionary.entries[0]), dictionary.entries[0].id);
    }
  }, [dictionary.entries, draft, loadDraft]);

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

  const select = useCallback(
    (id: number) => {
      if (id === selectedId || !canDiscard()) return;
      const entry = dictionary.entries.find((item) => item.id === id);
      if (entry) loadDraft(entryToInput(entry), id);
    },
    [canDiscard, dictionary.entries, loadDraft, selectedId],
  );

  const add = useCallback(
    (kind: DictionaryEntryInput["kind"]) => {
      if (canDiscard()) loadDraft(createDictionaryDraft(kind), null);
    },
    [canDiscard, loadDraft],
  );

  const save = useCallback(async () => {
    if (!draft) throw new Error("Select an entry");
    const normalized = normalizeDictionaryInput(draft);
    const parsed = dictionaryEntryInputSchema.safeParse(normalized);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid entry");
    const result = selectedId
      ? await updateDictionaryEntry(selectedId, parsed.data)
      : await createDictionaryEntry(parsed.data);
    loadDraft(entryToInput(result.entry), result.entry.id);
    await reload();
    toast.success("Dictionary saved");
    return result.entry;
  }, [draft, loadDraft, reload, selectedId]);

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
        await save();
        const text = previewText.trim();
        if (!text) throw new Error("Enter preview text");
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
        setSelectedId(null);
        setDraft(null);
        setSavedDraft("");
        setAnalysis(null);
        await reload();
        toast.success("Dictionary entry deleted");
      }),
    [reload, run, selectedId],
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
    kindFilter,
    setKindFilter,
    previewText,
    setPreviewText,
    analysis,
    selectedCandidate: draft && analysis ? findSelectedCandidate(draft, analysis) : null,
    pending,
    dirty,
    error,
    select,
    add,
    saveOnly,
    saveAndPreview,
    remove,
  };
}

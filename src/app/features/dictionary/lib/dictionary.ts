import type {
  DictionaryCandidate,
  DictionaryEntry,
  DictionaryEntryInput,
  DictionaryMorpheme,
  G2pItem,
} from "@/_schemas";

export function createMorpheme(surface = ""): DictionaryMorpheme {
  return {
    surface,
    reading: "",
    pronunciation: null,
    accent_nucleus: 0,
    part_of_speech: "proper_noun",
  };
}

export function createCandidate(surface = ""): DictionaryCandidate {
  return { description: "", examples: [], morphemes: [createMorpheme(surface)] };
}

export function createDictionaryDraft(kind: DictionaryEntryInput["kind"]): DictionaryEntryInput {
  return kind === "fixed"
    ? {
        kind,
        surface: "",
        reading: "",
        pronunciation: null,
        accent_nucleus: 0,
        part_of_speech: "proper_noun",
        enabled: true,
      }
    : {
        kind,
        surface: "",
        candidates: [createCandidate(), createCandidate()],
        enabled: true,
      };
}

export function entryToInput(entry: DictionaryEntry): DictionaryEntryInput {
  const { id: _, ...input } = entry;
  return structuredClone(input);
}

export function normalizeDictionaryInput(entry: DictionaryEntryInput): DictionaryEntryInput {
  const normalized = structuredClone(entry);
  if (normalized.kind === "fixed") {
    normalized.pronunciation = normalized.pronunciation?.trim() || null;
    return normalized;
  }
  normalized.candidates.forEach((candidate) => {
    candidate.description = candidate.description.trim();
    candidate.examples = candidate.examples.map((item) => item.trim()).filter(Boolean);
    candidate.morphemes.forEach((morpheme) => {
      morpheme.pronunciation = morpheme.pronunciation?.trim() || null;
    });
  });
  return normalized;
}

export function getDefaultPreviewText(entry: DictionaryEntryInput) {
  if (entry.kind === "fixed") return entry.surface;
  return entry.candidates.flatMap((candidate) => candidate.examples)[0] ?? entry.surface;
}

export function findSelectedCandidate(entry: DictionaryEntryInput, g2p: G2pItem) {
  if (entry.kind !== "contextual") return null;
  const words = g2p.segments
    .flatMap((segment) => segment.words)
    .filter((word) => !word.metadata.is_ignored);
  const matches = entry.candidates
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate }) =>
      candidate.morphemes.every((morpheme) =>
        words.some(
          (word) =>
            word.metadata.orig === morpheme.surface &&
            word.metadata.read === morpheme.reading &&
            word.moras.map((mora) => mora.text).join("") ===
              (morpheme.pronunciation || morpheme.reading),
        ),
      ),
    );
  return matches.length === 1 ? matches[0]!.index : null;
}

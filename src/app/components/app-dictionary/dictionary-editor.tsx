import type { Dispatch, SetStateAction } from "react";
import { Plus, Trash2 } from "lucide-react";
import type {
  DictionaryCandidate,
  DictionaryEntryInput,
  DictionaryMorpheme,
  DictionaryPartOfSpeech,
  G2pItem,
} from "@/_schemas";
import { Button } from "@/_shared/components/ui/button";
import { Input } from "@/_shared/components/ui/input";
import { Textarea } from "@/_shared/components/ui/textarea";
import { splitKanaMoras } from "@/_shared/lib/kana-mora";
import { createCandidate, createMorpheme } from "@/app/features/dictionary";
import { AccentEditor } from "./accent-editor";

const POSITIONS: Array<{ value: DictionaryPartOfSpeech; label: string }> = [
  { value: "proper_noun", label: "Proper noun" },
  { value: "common_noun", label: "Common noun" },
  { value: "adjective", label: "Adjective" },
  { value: "particle", label: "Particle" },
  { value: "filler", label: "Filler" },
];

const labelClass = "grid gap-1 text-xs font-medium text-muted-foreground";
const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring";

function clampAccent(pronunciation: string, accent: number) {
  return Math.min(accent, splitKanaMoras(pronunciation).length);
}

function PosSelect({
  value,
  onChange,
}: {
  value: DictionaryPartOfSpeech;
  onChange: (value: DictionaryPartOfSpeech) => void;
}) {
  return (
    <label className={labelClass}>
      Part of speech
      <select
        className={selectClass}
        value={value}
        onChange={(event) => onChange(event.target.value as DictionaryPartOfSpeech)}
      >
        {POSITIONS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MorphemeEditor({
  value,
  onChange,
  onRemove,
  removable,
}: {
  value: DictionaryMorpheme;
  onChange: (value: DictionaryMorpheme) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const effectivePronunciation = value.pronunciation || value.reading;
  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="grid gap-3 md:grid-cols-3">
        <label className={labelClass}>
          Surface
          <Input
            value={value.surface}
            onChange={(e) => onChange({ ...value, surface: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Reading
          <Input
            value={value.reading}
            onChange={(e) => {
              const reading = e.target.value;
              const pronunciation = value.pronunciation || reading;
              onChange({
                ...value,
                reading,
                accent_nucleus: clampAccent(pronunciation, value.accent_nucleus),
              });
            }}
          />
        </label>
        <label className={labelClass}>
          Pronunciation
          <Input
            placeholder="Same as reading"
            value={value.pronunciation ?? ""}
            onChange={(e) => {
              const pronunciation = e.target.value;
              onChange({
                ...value,
                pronunciation,
                accent_nucleus: clampAccent(pronunciation || value.reading, value.accent_nucleus),
              });
            }}
          />
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto]">
        <label className={labelClass}>
          Accent nucleus
          <AccentEditor
            pronunciation={effectivePronunciation}
            value={value.accent_nucleus}
            onChange={(accent_nucleus) => onChange({ ...value, accent_nucleus })}
          />
        </label>
        <PosSelect
          value={value.part_of_speech}
          onChange={(part_of_speech) => onChange({ ...value, part_of_speech })}
        />
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={!removable}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}

function CandidateEditor({
  value,
  index,
  selected,
  onChange,
  onRemove,
  removable,
}: {
  value: DictionaryCandidate;
  index: number;
  selected: boolean;
  onChange: (value: DictionaryCandidate) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  return (
    <div
      className={`grid gap-3 rounded-xl border p-3 ${selected ? "border-primary ring-1 ring-primary" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <strong>Candidate {index + 1}</strong>
        <div className="flex items-center gap-2">
          {selected && <span className="text-xs text-primary">Selected by analysis</span>}
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={!removable}
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      <label className={labelClass}>
        Description
        <Input
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </label>
      <label className={labelClass}>
        Examples (one per line)
        <Textarea
          rows={2}
          value={value.examples.join("\n")}
          onChange={(e) => onChange({ ...value, examples: e.target.value.split("\n") })}
        />
      </label>
      <div className="grid gap-2">
        {value.morphemes.map((morpheme, morphemeIndex) => (
          <MorphemeEditor
            key={morphemeIndex}
            value={morpheme}
            removable={value.morphemes.length > 1}
            onRemove={() =>
              onChange({
                ...value,
                morphemes: value.morphemes.filter((_, itemIndex) => itemIndex !== morphemeIndex),
              })
            }
            onChange={(next) =>
              onChange({
                ...value,
                morphemes: value.morphemes.map((item, itemIndex) =>
                  itemIndex === morphemeIndex ? next : item,
                ),
              })
            }
          />
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-fit"
          onClick={() => onChange({ ...value, morphemes: [...value.morphemes, createMorpheme()] })}
        >
          <Plus /> Add morpheme
        </Button>
      </div>
    </div>
  );
}

export function DictionaryEditor({
  draft,
  setDraft,
  selectedCandidate,
}: {
  draft: DictionaryEntryInput;
  setDraft: Dispatch<SetStateAction<DictionaryEntryInput | null>>;
  selectedCandidate: number | null;
}) {
  const update = (next: DictionaryEntryInput) => setDraft(next);
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <label className={labelClass}>
          Surface
          <Input
            value={draft.surface}
            onChange={(e) => update({ ...draft, surface: e.target.value })}
          />
        </label>
        <label className="flex items-end gap-2 pb-1 text-sm">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => update({ ...draft, enabled: e.target.checked })}
          />
          Enabled
        </label>
      </div>

      {draft.kind === "fixed" ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <label className={labelClass}>
              Reading
              <Input
                value={draft.reading}
                onChange={(e) => {
                  const reading = e.target.value;
                  update({
                    ...draft,
                    reading,
                    accent_nucleus: clampAccent(
                      draft.pronunciation || reading,
                      draft.accent_nucleus,
                    ),
                  });
                }}
              />
            </label>
            <label className={labelClass}>
              Pronunciation
              <Input
                placeholder="Same as reading"
                value={draft.pronunciation ?? ""}
                onChange={(e) => {
                  const pronunciation = e.target.value;
                  update({
                    ...draft,
                    pronunciation,
                    accent_nucleus: clampAccent(
                      pronunciation || draft.reading,
                      draft.accent_nucleus,
                    ),
                  });
                }}
              />
            </label>
          </div>
          <PosSelect
            value={draft.part_of_speech}
            onChange={(part_of_speech) => update({ ...draft, part_of_speech })}
          />
          <label className={labelClass}>
            Accent nucleus
            <AccentEditor
              pronunciation={draft.pronunciation || draft.reading}
              value={draft.accent_nucleus}
              onChange={(accent_nucleus) => update({ ...draft, accent_nucleus })}
            />
          </label>
        </>
      ) : (
        <div className="grid gap-3">
          {draft.candidates.map((candidate, index) => (
            <CandidateEditor
              key={index}
              value={candidate}
              index={index}
              selected={selectedCandidate === index}
              removable={draft.candidates.length > 2}
              onRemove={() =>
                update({
                  ...draft,
                  candidates: draft.candidates.filter((_, itemIndex) => itemIndex !== index),
                })
              }
              onChange={(next) =>
                update({
                  ...draft,
                  candidates: draft.candidates.map((item, itemIndex) =>
                    itemIndex === index ? next : item,
                  ),
                })
              }
            />
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-fit"
            onClick={() =>
              update({
                ...draft,
                candidates: [...draft.candidates, createCandidate(draft.surface)],
              })
            }
          >
            <Plus /> Add candidate
          </Button>
        </div>
      )}
    </div>
  );
}

export function AnalysisResult({ analysis }: { analysis: G2pItem }) {
  return (
    <div className="grid gap-2 rounded-lg border p-3">
      <strong className="text-sm">Analysis result</strong>
      <div className="flex flex-wrap gap-2">
        {analysis.segments.flatMap((segment) =>
          segment.words.map((word, index) => (
            <div
              key={`${word.metadata.orig}-${index}`}
              className="grid gap-1 rounded-lg bg-muted p-2 text-xs"
            >
              <span>{word.metadata.orig}</span>
              <span className="text-muted-foreground">{word.metadata.read}</span>
              <span className="flex gap-1">
                {word.moras.map((mora, moraIndex) => (
                  <span
                    key={moraIndex}
                    className={mora.pitch === "high" ? "text-primary font-bold" : ""}
                  >
                    {mora.text}
                  </span>
                ))}
              </span>
            </div>
          )),
        )}
      </div>
    </div>
  );
}

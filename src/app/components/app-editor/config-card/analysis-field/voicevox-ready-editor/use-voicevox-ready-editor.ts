import { useState } from "react";
import {
  getVoicevoxPhraseKey,
  mergeVoicevoxPhrases,
  setVoicevoxAccent,
  splitVoicevoxPhrase,
  type VoicevoxAccentPhrase,
  type VoicevoxAudioQuery,
} from "@/app/components/app-editor/config-card/analysis-field/voicevox-analysis";

export function useVoicevoxReadyEditor(
  query: VoicevoxAudioQuery,
  onUpdateQuery: (mutate: (query: VoicevoxAudioQuery) => void) => void,
) {
  const [splitOffsets, setSplitOffsets] = useState<Record<string, number>>({});

  function createBoundaryHandler(phrase: VoicevoxAccentPhrase, phraseIndex: number) {
    const phraseKey = getVoicevoxPhraseKey(phrase);
    const splitOffset = splitOffsets[phraseKey];
    if (splitOffset) {
      return () => {
        onUpdateQuery((nextQuery) => splitVoicevoxPhrase(nextQuery, phraseIndex, splitOffset));
        setSplitOffsets((current) => {
          const { [phraseKey]: _removed, ...rest } = current;
          return rest;
        });
      };
    }

    if (!query.accent_phrases[phraseIndex + 1]) {
      return undefined;
    }

    return () => {
      onUpdateQuery((nextQuery) => {
        const offset = mergeVoicevoxPhrases(nextQuery, phraseIndex);
        const nextPhrase = nextQuery.accent_phrases[phraseIndex];
        if (offset && nextPhrase) {
          setSplitOffsets((current) => ({
            ...current,
            [getVoicevoxPhraseKey(nextPhrase)]: offset,
          }));
        }
      });
    };
  }

  return {
    splitOffsets,
    createBoundaryHandler,
    setAccent: (phraseIndex: number, moraIndex: number) => {
      onUpdateQuery((nextQuery) => setVoicevoxAccent(nextQuery, phraseIndex, moraIndex));
    },
  };
}

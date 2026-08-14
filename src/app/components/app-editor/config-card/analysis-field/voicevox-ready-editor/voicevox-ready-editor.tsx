import {
  getVoicevoxPhraseKey,
  type VoicevoxAudioQuery,
} from "@/app/components/app-editor/config-card/analysis-field/voicevox-analysis";
import { WordCard } from "@/app/components/app-editor/config-card/analysis-field/word-card/word-card";
import { useVoicevoxReadyEditor } from "@/app/components/app-editor/config-card/analysis-field/voicevox-ready-editor/use-voicevox-ready-editor";

export function VoicevoxReadyEditor({
  onUpdateQuery,
  query,
}: {
  onUpdateQuery: (mutate: (query: VoicevoxAudioQuery) => void) => void;
  query: VoicevoxAudioQuery;
}) {
  const { splitOffsets, createBoundaryHandler, setAccent } = useVoicevoxReadyEditor(
    query,
    onUpdateQuery,
  );

  return (
    <div className="grid gap-3">
      {query.accent_phrases.map((phrase, phraseIndex) => {
        const phraseKey = getVoicevoxPhraseKey(phrase);
        return (
          <WordCard
            key={`${phraseIndex}-${phraseKey}`}
            isChained={Boolean(splitOffsets[phraseKey])}
            moraButtons={phrase.moras.map((mora, moraIndex) => ({
              label: mora.text,
              active: phrase.accent === moraIndex + 1,
              onClick: () => setAccent(phraseIndex, moraIndex),
            }))}
            onToggleChain={createBoundaryHandler(phrase, phraseIndex)}
          />
        );
      })}
    </div>
  );
}

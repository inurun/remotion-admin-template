import type { TsmlPhraseViewModel } from "@/app/components/app-editor/config-card/tsml-field/use-tsml-field";
import { WordCard } from "@/app/components/app-editor/config-card/analysis-field/word-card/word-card";

export function TsmlPhraseView({ phrase }: { phrase: TsmlPhraseViewModel }) {
  return (
    <div className="flex flex-wrap gap-3">
      {phrase.words.map((word) => (
        <WordCard
          key={word.key}
          isChained={word.isChained}
          moraButtons={word.moraButtons}
          onToggleChain={word.onToggleChain}
        />
      ))}
    </div>
  );
}

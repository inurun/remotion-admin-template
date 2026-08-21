import { AccentEditor } from "@/_shared/components/accent-editor/accent-editor";
import { ChainButton } from "@/app/components/app-editor/config-card/analysis-field/word-card/chain-button/chain-button";
import type { G2pPhraseView } from "@/app/components/app-editor/config-card/analysis-field/g2p-analysis-editor/use-g2p-analysis-editor";

export function WordCard({ words, moras, accent, onAccentChange }: G2pPhraseView) {
  return (
    <div className="grid gap-2 bg-card">
      <AccentEditor moras={moras} value={accent} onChange={onAccentChange} />
      <div className="flex flex-wrap gap-1">
        {words.map((word) =>
          word.ignored ? (
            <span key={word.key} className="px-1 text-sm text-muted-foreground/60">
              {word.surface || " "}
            </span>
          ) : (
            <span key={word.key} className="flex items-center gap-1 text-xs text-muted-foreground">
              {word.surface}
              <ChainButton isChained={word.isChained} onToggleChain={word.onToggleChain} />
            </span>
          ),
        )}
      </div>
    </div>
  );
}

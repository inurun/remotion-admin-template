import { AccentEditor } from "@/_shared/components/accent-editor/accent-editor";
import { ChainButton } from "./chain-button/chain-button";

export type G2pPhraseWordView = {
  key: string;
  label: string;
  chained: boolean;
  onToggleChain?: () => void;
};

export function G2pPhraseView({
  words,
  moras,
  accent,
  boundary,
  disabled,
  onAccentChange,
}: {
  words: G2pPhraseWordView[];
  moras: string[];
  accent: number;
  boundary?: string;
  disabled?: boolean;
  onAccentChange: (accent: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="grid gap-2 rounded-xl border bg-background p-3">
        <div className="flex flex-wrap items-center gap-2">
          {words.map((word) => (
            <div key={word.key} className="flex items-center gap-1">
              {word.onToggleChain ? (
                <ChainButton
                  chained={word.chained}
                  disabled={disabled}
                  onToggle={word.onToggleChain}
                />
              ) : null}
              <span className="font-mono text-sm">{word.label}</span>
            </div>
          ))}
        </div>
        <div className={disabled ? "pointer-events-none opacity-50" : undefined}>
          <AccentEditor moras={moras} value={accent} onChange={onAccentChange} />
        </div>
      </div>
      {boundary ? <div className="text-xs text-muted-foreground">{boundary}</div> : null}
    </div>
  );
}

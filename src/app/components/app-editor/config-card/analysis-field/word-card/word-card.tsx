import type { TsmlMoraButton } from "@/app/components/app-editor/config-card/tsml-field/use-tsml-field";
import { ChainButton } from "@/app/components/app-editor/config-card/analysis-field/word-card/chain-button/chain-button";
import { MoraButtons } from "@/app/components/app-editor/config-card/analysis-field/word-card/mora-buttons/mora-buttons";

export function WordCard({
  isChained,
  moraButtons,
  onToggleChain,
}: {
  isChained: boolean;
  moraButtons: TsmlMoraButton[];
  onToggleChain?: () => void;
}) {
  return (
    <div className="flex gap-3 bg-card">
      <MoraButtons moraButtons={moraButtons} />
      <ChainButton isChained={isChained} onToggleChain={onToggleChain} />
    </div>
  );
}

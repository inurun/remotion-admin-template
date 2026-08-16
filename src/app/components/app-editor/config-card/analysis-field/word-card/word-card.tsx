import { ChainButton } from "@/app/components/app-editor/config-card/analysis-field/word-card/chain-button/chain-button";
import { MoraButtons } from "@/app/components/app-editor/config-card/analysis-field/word-card/mora-buttons/mora-buttons";
import type { G2pMoraButton } from "@/app/components/app-editor/config-card/analysis-field/g2p-analysis-editor/use-g2p-analysis-editor";

export function WordCard({
  isChained,
  moraButtons,
  onToggleChain,
}: {
  isChained: boolean;
  moraButtons: G2pMoraButton[];
  onToggleChain?: () => void;
}) {
  return (
    <div className="flex gap-3 bg-card">
      <MoraButtons moraButtons={moraButtons} />
      <ChainButton isChained={isChained} onToggleChain={onToggleChain} />
    </div>
  );
}

import { Button } from "@/_shared/components/ui/button";
import type { G2pMoraButton } from "@/app/components/app-editor/config-card/analysis-field/g2p-analysis-editor/use-g2p-analysis-editor";

export function MoraButtons({ moraButtons }: { moraButtons: G2pMoraButton[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {moraButtons.map((button, index) => (
        <Button
          key={index}
          type="button"
          size="sm"
          variant={button.pitch === "high" ? "default" : "outline"}
          onClick={button.onClick}
        >
          {button.label}
        </Button>
      ))}
    </div>
  );
}

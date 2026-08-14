import { Button } from "@/_shared/components/ui/button";
import type { TsmlMoraButton } from "@/app/components/app-editor/config-card/tsml-field/use-tsml-field";

export function MoraButtons({ moraButtons }: { moraButtons: TsmlMoraButton[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {moraButtons.map((button, index) => (
        <Button
          key={index}
          type="button"
          size="sm"
          variant={button.active ? "default" : "outline"}
          onClick={button.onClick}
        >
          {button.label}
        </Button>
      ))}
    </div>
  );
}

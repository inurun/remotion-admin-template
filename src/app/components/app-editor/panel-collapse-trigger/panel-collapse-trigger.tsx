import { ChevronDown } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";
import { CollapsibleTrigger } from "@/_shared/components/ui/collapsible";

export function PanelCollapseTrigger() {
  return (
    <CollapsibleTrigger
      render={<Button type="button" variant="ghost" size="icon-sm" />}
      title="Toggle"
    >
      <ChevronDown className="size-4 transition-transform in-data-open:rotate-180" />
    </CollapsibleTrigger>
  );
}

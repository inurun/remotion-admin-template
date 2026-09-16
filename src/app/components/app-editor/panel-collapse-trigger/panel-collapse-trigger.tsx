import { ChevronDown } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { CollapsibleTrigger } from "@/app/components/ui/collapsible";

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

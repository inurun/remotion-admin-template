import { Link, Unlink } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";

export function ChainButton({
  chained,
  disabled,
  onToggle,
}: {
  chained: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      size="icon-xs"
      variant={chained ? "default" : "outline"}
      disabled={disabled}
      title={chained ? "Unchain" : "Chain"}
      onClick={onToggle}
    >
      {chained ? <Link /> : <Unlink />}
    </Button>
  );
}

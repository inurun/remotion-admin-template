import { Link2, Unlink2 } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";

function getChainButtonContent(isChained: boolean) {
  if (isChained) {
    return {
      icon: <Link2 />,
      label: "連結中",
      className: "text-accent-foreground",
    };
  }

  return {
    icon: <Unlink2 />,
    label: "連結なし",
    className: "text-muted-foreground",
  };
}

export function ChainButton({
  isChained,
  onToggleChain,
}: {
  isChained: boolean;
  onToggleChain?: () => void;
}) {
  if (!onToggleChain) {
    return null;
  }
  const content = getChainButtonContent(isChained);

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="outline"
      onClick={onToggleChain}
      title={content.label}
      aria-label={content.label}
      className={content.className}
    >
      {content.icon}
    </Button>
  );
}

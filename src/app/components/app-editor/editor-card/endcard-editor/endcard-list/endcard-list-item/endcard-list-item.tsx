import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";
import { cn } from "@/_shared/lib/utils";
import { useEndcardListItem } from "./use-endcard-list-item";

export function EndcardListItem({
  itemId,
  index,
  onRemove,
  children,
}: {
  itemId: string;
  index: number;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const { ref, handleRef, isDragging } = useEndcardListItem(itemId, index);

  return (
    <article
      ref={ref}
      data-dragging={isDragging}
      className={cn(
        "flex gap-2 rounded-lg border border-border bg-card p-3 transition data-[dragging=true]:opacity-70 items-center",
      )}
    >
      <span
        ref={handleRef}
        className="inline-flex size-6 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground active:cursor-grabbing"
        title="Reorder"
      >
        <GripVertical className="size-4" />
      </span>
      <div className="flex-1 flex flex-col gap-2">{children}</div>
      <Button
        type="button"
        size="icon-xs"
        variant="destructive"
        onClick={onRemove}
        title="Delete"
        className="self-start"
      >
        <Trash2 />
      </Button>
    </article>
  );
}

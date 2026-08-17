import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";
import { PageThumbnail } from "@/app/components/app-editor/editor-card/page-list/page-list-item/page-thumbnail/page-thumbnail";
import {
  type PageListItemProps,
  usePageListItem,
} from "@/app/components/app-editor/editor-card/page-list/page-list-item/use-page-list-item";

export function PageListItem({
  index,
  isSelected,
  onRemove,
  onSelect,
  pageId,
  thumbnail,
}: PageListItemProps) {
  const { ref, handleRef, isDragging, aspectRatio, dirty, pageType } = usePageListItem({
    index,
    pageId,
  });

  return (
    <article
      ref={ref}
      data-dragging={isDragging}
      data-selected={isSelected}
      className="group/page relative min-w-30 grid gap-2 rounded-lg border border-border bg-card p-2 transition data-[dragging=true]:opacity-70 data-[selected=true]:border-primary data-[selected=true]:ring-2 data-[selected=true]:ring-primary/20"
    >
      <button
        type="button"
        onClick={onSelect}
        className="grid cursor-pointer gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div
          className="overflow-hidden rounded-md border border-border opacity-100 group-hover/page:opacity-30 transition-opacity"
          style={{ aspectRatio }}
        >
          <PageThumbnail {...thumbnail} dirty={dirty} />
        </div>
        <div className="absolute top-3 left-3 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {pageType}
        </div>
        <div className="absolute bottom-3 right-2 min-w-0 items-center justify-end gap-2 px-0.5">
          <span
            ref={handleRef}
            className="inline-flex size-6 cursor-grab items-center justify-center rounded-md opacity-30 group-hover/page:opacity-100 text-primary active:cursor-grabbing"
            aria-label="並び替え"
            title="並び替え"
          >
            <GripVertical className="size-4" />
          </span>
        </div>
      </button>
      <Button
        type="button"
        size="icon-xs"
        variant="destructive"
        title="削除"
        aria-label={`Page ${index + 1} を削除`}
        onClick={onRemove}
        className="absolute top-3 right-3 opacity-100 shadow-sm sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover/page:opacity-100"
      >
        <Trash2 />
      </Button>
    </article>
  );
}

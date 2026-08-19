import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";
import { cn } from "@/_shared/lib/utils";
import { PageThumbnail } from "@/app/components/app-editor/editor-card/page-list/page-list-item/page-thumbnail/page-thumbnail";
import {
  type PageListItemProps,
  usePageListItem,
} from "@/app/components/app-editor/editor-card/page-list/page-list-item/use-page-list-item";

const PAGE_LIST_ITEM_CLASS =
  "group/page relative min-w-30 rounded-lg border border-border bg-card transition animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-700 data-[dragging=true]:opacity-70 data-[selected=true]:border-primary data-[selected=true]:ring-2 data-[selected=true]:ring-primary/20";

export function PageListItem({
  index,
  isSelected,
  onRemove,
  onSelect,
  pageId,
  thumbnail,
}: PageListItemProps) {
  const { ref, handleRef, isDragging, aspectRatio, dirty, presentation, staggerDelayMs } =
    usePageListItem({
      index,
      pageId,
    });

  if (presentation?.kind === "transition") {
    return (
      <article
        ref={ref}
        data-dragging={isDragging}
        data-selected={isSelected}
        className={cn(PAGE_LIST_ITEM_CLASS, "flex items-center gap-1 self-start px-2 py-1")}
        style={{ animationDelay: `${staggerDelayMs}ms` }}
      >
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            transition
          </span>
          <span className="min-w-0 truncate text-xs">{presentation.variant}</span>
          <span
            ref={handleRef}
            className="ml-auto inline-flex size-6 cursor-grab items-center justify-center rounded-md text-primary opacity-30 group-hover/page:opacity-100 active:cursor-grabbing"
            aria-label="並び替え"
            title="並び替え"
          >
            <GripVertical className="size-4" />
          </span>
        </button>
        <Button
          type="button"
          size="icon-xs"
          variant="destructive"
          title="削除"
          aria-label={`Page ${index + 1} を削除`}
          onClick={onRemove}
          className="opacity-100 shadow-sm sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover/page:opacity-100"
        >
          <Trash2 />
        </Button>
      </article>
    );
  }

  return (
    <article
      ref={ref}
      data-dragging={isDragging}
      data-selected={isSelected}
      className={cn(PAGE_LIST_ITEM_CLASS, "grid gap-2 p-2")}
      style={{ animationDelay: `${staggerDelayMs}ms` }}
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
          {presentation?.pageType}
        </div>
        {presentation?.title ? (
          <div className="absolute bottom-3 left-3 right-8 truncate rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium">
            {presentation.title}
          </div>
        ) : null}
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

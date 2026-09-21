import { GripVertical, Play, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/_shared/lib/utils";
import { PAGE_TYPE_THUMBNAIL_GRADIENT } from "@/app/components/app-editor/editor-card/page-list/page-list.lib";
import {
  type PageListItemProps,
  usePageListItem,
} from "@/app/components/app-editor/editor-card/page-list/page-list-item/use-page-list-item";

const PAGE_LIST_ITEM_CLASS = cn(
  "group/page relative min-w-0 w-full max-w-50 overflow-hidden rounded-lg border border-border bg-card transition data-[dragging=true]:opacity-70 data-[selected=true]:border-primary",
);

const THUMBNAIL_BADGE_CLASS = cn(
  "w-fit rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium",
);

export function PageListItem({
  index,
  isPlaying,
  isSelected,
  onRemove,
  onSelect,
  pageId,
}: PageListItemProps) {
  const { ref, handleRef, isDragging, aspectRatio, dirty, presentation } = usePageListItem({
    index,
    isPlaying,
    pageId,
  });

  if (presentation?.kind === "transition") {
    return (
      <article
        ref={ref}
        data-dragging={isDragging}
        data-playing={isPlaying}
        data-selected={isSelected}
        className={cn(PAGE_LIST_ITEM_CLASS, "flex items-center gap-1 self-start px-2 py-1")}
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
      data-playing={isPlaying}
      data-selected={isSelected}
      className={cn(PAGE_LIST_ITEM_CLASS, "grid gap-2 p-2 shrink-0")}
    >
      <button
        type="button"
        onClick={onSelect}
        className="grid cursor-pointer gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div
          className="relative overflow-hidden rounded-md border border-border"
          style={{ aspectRatio }}
        >
          <div
            className="size-full bg-muted transition-opacity group-hover/page:opacity-30"
            style={
              presentation
                ? { backgroundImage: PAGE_TYPE_THUMBNAIL_GRADIENT[presentation.pageType] }
                : undefined
            }
          />
          <span
            className={cn(
              "pointer-events-none absolute inset-0 z-10 grid place-items-center text-white transition duration-200",
              isPlaying ? "translate-y-0 opacity-80" : "translate-y-2 opacity-0",
            )}
          >
            <Play className="size-5 fill-current drop-shadow-md" />
          </span>
          <div
            className={cn(
              THUMBNAIL_BADGE_CLASS,
              "absolute top-1 left-1 z-20 uppercase tracking-wide text-muted-foreground",
            )}
          >
            {presentation?.pageType}
          </div>
          {dirty ? (
            <span className="absolute top-1 right-1 z-20 rounded bg-background/90 px-1 py-0.5 text-[10px] font-medium">
              Dirty
            </span>
          ) : null}
          <div className="absolute bottom-1 left-1 z-20 flex items-end gap-1">
            <span
              ref={handleRef}
              className="inline-flex size-6 cursor-grab items-center justify-center rounded-md text-primary opacity-30 group-hover/page:opacity-100 active:cursor-grabbing"
              aria-label="並び替え"
              title="並び替え"
            >
              <GripVertical className="size-4" />
            </span>
            {presentation && presentation.ttsCount > 0 ? (
              <div className={THUMBNAIL_BADGE_CLASS}>TTS {presentation.ttsCount}</div>
            ) : null}
          </div>
          {presentation?.title ? (
            <div
              className={cn(
                THUMBNAIL_BADGE_CLASS,
                "absolute right-1 bottom-1 z-20 max-w-[70%] truncate",
              )}
            >
              {presentation.title}
            </div>
          ) : null}
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

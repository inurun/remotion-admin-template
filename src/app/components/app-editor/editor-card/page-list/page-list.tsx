import { DragDropProvider } from "@dnd-kit/react";
import { usePageList } from "@/app/components/app-editor/editor-card/page-list/use-page-list";
import { AddPageDialog } from "@/app/components/app-editor/editor-card/page-list/add-page-dialog/add-page-dialog";
import { PageListItem } from "@/app/components/app-editor/editor-card/page-list/page-list-item/page-list-item";

export function PageList() {
  const { handleDragEnd, sequenceOrder, remove, selectedPageIndex, playingPageId, selectPage } =
    usePageList();

  return (
    <aside className="flex h-full min-h-0 min-w-0 w-full max-w-full flex-col gap-3 overflow-hidden min-h-150">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>Pages</span>
        <AddPageDialog />
      </div>
      {sequenceOrder.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          No pages.
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <DragDropProvider onDragEnd={handleDragEnd}>
            <div
              className="flex max-h-full min-w-0 w-full items-start gap-2 overflow-auto sm:grid sm:grid-cols-1"
              style={{
                scrollbarWidth: "none",
              }}
            >
              {sequenceOrder.map((pageId, index) => (
                <PageListItem
                  key={pageId}
                  index={index}
                  isSelected={selectedPageIndex === index}
                  isPlaying={playingPageId === pageId}
                  onRemove={() => remove(index)}
                  onSelect={() => selectPage(index)}
                  pageId={pageId}
                />
              ))}
            </div>
          </DragDropProvider>
        </div>
      )}
    </aside>
  );
}

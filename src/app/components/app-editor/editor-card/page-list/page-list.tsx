import { DragDropProvider } from "@dnd-kit/react";
import { usePageList } from "@/app/components/app-editor/editor-card/page-list/use-page-list";
import { AddPageDialog } from "@/app/components/app-editor/editor-card/page-list/add-page-dialog/add-page-dialog";
import { PageListItem } from "@/app/components/app-editor/editor-card/page-list/page-list-item/page-list-item";

export function PageList() {
  const { component, handleDragEnd, sequenceOrder, remove, selectedPageIndex, selectPage } =
    usePageList();

  if (!component) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        Loading pages...
      </div>
    );
  }

  return (
    <aside className="flex flex-col gap-3 max-w-full overflow-hidden">
      <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
        <span>Pages</span>
        <AddPageDialog />
      </div>
      {sequenceOrder.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          No pages.
        </div>
      ) : (
        <DragDropProvider onDragEnd={handleDragEnd}>
          <div className="flex sm:grid overflow-x-auto max-w-full gap-2">
            {sequenceOrder.map((pageId, index) => (
              <PageListItem
                key={pageId}
                index={index}
                isSelected={selectedPageIndex === index}
                onRemove={() => remove(index)}
                onSelect={() => selectPage(index)}
                pageId={pageId}
                thumbnail={{
                  component,
                  pageId,
                }}
              />
            ))}
          </div>
        </DragDropProvider>
      )}
    </aside>
  );
}

import { DragDropProvider } from "@dnd-kit/react";
import { usePageList } from "@/app/components/app-editor/editor-card/page-list/use-page-list";
import { AddPageDialog } from "@/app/components/app-editor/editor-card/page-list/add-page-dialog/add-page-dialog";
import { PageListItem } from "@/app/components/app-editor/editor-card/page-list/page-list-item/page-list-item";
import { PageListLoading } from "@/app/components/app-editor/editor-card/page-list/page-list-loading/page-list-loading";

export function PageList() {
  const { component, handleDragEnd, sequenceOrder, remove, selectedPageIndex, selectPage } =
    usePageList();

  if (!component) {
    return <PageListLoading count={sequenceOrder.length} />;
  }

  return (
    <aside className="flex max-w-full flex-col gap-3 overflow-hidden">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>Pages</span>
        <AddPageDialog />
      </div>
      {sequenceOrder.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          No pages.
        </div>
      ) : (
        <DragDropProvider onDragEnd={handleDragEnd}>
          <div className="flex max-w-full gap-2 overflow-x-auto sm:grid">
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

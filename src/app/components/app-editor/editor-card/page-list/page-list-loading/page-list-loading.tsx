import { Skeleton } from "@/_shared/components/ui/skeleton";
import { usePageListLoading } from "@/app/components/app-editor/editor-card/page-list/page-list-loading/use-page-list-loading";

export function PageListLoading({ count }: { count: number }) {
  const { aspectRatio } = usePageListLoading();
  const items = Math.max(count, 1);

  return (
    <aside className="flex max-w-full flex-col gap-3 overflow-hidden">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>Pages</span>
        <Skeleton className="size-7 rounded-md" />
      </div>
      <div className="flex max-w-full gap-2 overflow-x-auto sm:grid">
        {Array.from({ length: items }, (_, index) => (
          <div
            key={index}
            className="min-w-30 grid gap-2 rounded-lg border border-border bg-card p-2"
          >
            <Skeleton className="w-full rounded-md" style={{ aspectRatio }} />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </aside>
  );
}

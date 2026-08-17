import { Skeleton } from "@/_shared/components/ui/skeleton";
import { usePreviewLoading } from "@/app/components/app-editor/preview-card/preview-loading/use-preview-loading";

export function PreviewLoading() {
  const { aspectRatio } = usePreviewLoading();

  return (
    <div className="grid gap-3">
      <Skeleton className="w-full rounded-md" style={{ aspectRatio }} />
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="h-2 flex-1 rounded-full" />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>
    </div>
  );
}

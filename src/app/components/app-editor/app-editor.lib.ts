import { cn } from "@/_shared/lib/utils";

export function getPreviewConfigColumnClassName(sticky: boolean) {
  return cn(
    "flex min-h-0 flex-col gap-4",
    sticky && "sticky top-6 max-h-[calc(100dvh-2rem)] overflow-hidden",
  );
}

export function getPreviewConfigScrollClassName(sticky: boolean) {
  return cn(sticky && "min-h-0 flex-1 overflow-y-auto overscroll-contain");
}

import { cn } from "@/_shared/lib/utils";

export function getPreviewConfigColumnClassName(fillHeight: boolean) {
  return cn("flex min-h-0 flex-col gap-4", fillHeight && "h-full overflow-hidden");
}

export function getPreviewPaneClassName() {
  return "shrink-0";
}

export function getConfigPaneClassName(fillHeight: boolean, configOpen: boolean) {
  return cn(
    fillHeight && configOpen && "min-h-0 flex-1 overflow-y-auto overscroll-contain",
    (!fillHeight || !configOpen) && "shrink-0",
  );
}

export function getEditorColumnClassName() {
  return "flex h-full min-h-0 max-w-full flex-col gap-4 overflow-y-auto";
}

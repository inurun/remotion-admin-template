import type { ReactNode } from "react";
import { cn } from "@/_shared/lib/utils";

export const PAGE_SWITCH_FADE_CLASS = cn(
  "animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-300",
);

export function PageSwitchFade({
  pageId,
  className,
  children,
}: {
  pageId: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div key={pageId} className={cn(PAGE_SWITCH_FADE_CLASS, className)}>
      {children}
    </div>
  );
}

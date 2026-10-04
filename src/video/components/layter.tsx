/** @jsxImportSource @inurun/vite-plugin-hyperframes-jsx */
import type { HfNode, StyleObject } from "@inurun/vite-plugin-hyperframes-jsx/runtime";
import { cn } from "@/_shared/lib/utils";

export function Layer({
  children,
  className,
  style,
}: {
  children?: HfNode;
  className?: string;
  style?: StyleObject;
}) {
  return (
    <div className={cn("absolute inset-0 size-full", className)} style={style}>
      {children}
    </div>
  );
}

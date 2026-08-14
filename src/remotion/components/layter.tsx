import { cn } from "@/_shared/lib/utils";

export function Layer({
  children,
  className,
  style,
}: {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cn("absolute inset-0 size-full", className)} style={style}>
      {children}
    </div>
  );
}

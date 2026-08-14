import { forwardRef, useEffect, useState, type ComponentProps } from "react";
import { cn } from "@/_shared/lib/utils";

type TextareaProps = Omit<ComponentProps<"textarea">, "children">;

function toText(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function toMinimumRows(rows: number | undefined) {
  return Math.max(rows ?? 1, 1);
}

function getMinimumRowText(rows: number) {
  return `${"\n".repeat(rows - 1)} `;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, defaultValue, onChange, rows = 1, style, value, ...props },
  ref,
) {
  const minimumRows = toMinimumRows(rows);
  const [innerValue, setInnerValue] = useState(() => toText(value ?? defaultValue));

  useEffect(() => {
    if (value === undefined) {
      return;
    }

    setInnerValue(toText(value));
  }, [value]);

  const mirrorValue = innerValue.length > 0 ? innerValue : getMinimumRowText(minimumRows);

  return (
    <div className="relative grid">
      <p
        className={cn(
          "invisible col-start-1 row-start-1 min-w-0 whitespace-pre-wrap wrap-break-word rounded-md border border-transparent px-3 py-2 text-sm leading-5",
          className,
        )}
      >
        {mirrorValue}
      </p>
      <textarea
        {...props}
        className={cn(
          "border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 col-start-1 row-start-1 field-sizing-content resize-none rounded-md border px-3 py-2 text-sm leading-5 shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        defaultValue={defaultValue}
        onChange={(event) => {
          setInnerValue(event.target.value);
          onChange?.(event);
        }}
        ref={ref}
        rows={minimumRows}
        style={style}
        value={value}
      />
    </div>
  );
});

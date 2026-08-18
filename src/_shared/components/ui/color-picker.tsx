import { HexColorPicker } from "react-colorful";
import { Input } from "@/_shared/components/ui/input";
import { cn } from "@/_shared/lib/utils";
import { useColorPicker } from "@/_shared/components/ui/use-color-picker";

export function ColorPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}) {
  const picker = useColorPicker({ value, onChange });

  return (
    <div className={cn("grid gap-2", className)}>
      <HexColorPicker
        color={picker.color}
        onChange={picker.handlePickerChange}
        className="h-32! w-full!"
      />
      <div className="flex items-center gap-2">
        <span
          className="size-8 shrink-0 rounded-md border border-border"
          style={{ backgroundColor: picker.color }}
        />
        <Input
          value={picker.draft}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => picker.handleDraftChange(event.target.value)}
        />
      </div>
    </div>
  );
}

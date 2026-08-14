import * as React from "react";
import { useRecordHotkeys } from "react-hotkeys-hook";
import { X } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";
import { Input } from "@/_shared/components/ui/input";
import { recordedKeysToHotkey } from "@/_shared/components/ui/hotkey-input.lib";
import { cn } from "@/_shared/lib/utils";

function getDisplayValue({
  isRecording,
  recordedValue,
  value,
}: {
  isRecording: boolean;
  recordedValue: string | null;
  value: string;
}) {
  return isRecording ? (recordedValue ?? "") : value;
}

function HotkeyClearButton({ onClear, visible }: { onClear: () => void; visible: boolean }) {
  if (!visible) {
    return null;
  }

  return (
    <Button
      type="button"
      size="icon-xs"
      variant="ghost"
      className="absolute top-1 right-1"
      title="Clear"
      aria-label="Clear"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClear}
    >
      <X />
    </Button>
  );
}

export function HotkeyInput({
  className,
  onValueChange,
  placeholder,
  value,
  ...props
}: Omit<React.ComponentProps<"input">, "onChange" | "readOnly" | "value"> & {
  onValueChange: (value: string) => void;
  value: string;
}) {
  const [keys, { isRecording, resetKeys, start, stop }] = useRecordHotkeys(false);
  const recordedValue = recordedKeysToHotkey(keys);
  const displayValue = getDisplayValue({ isRecording, recordedValue, value });

  const handleFocus = () => {
    resetKeys();
    start();
  };

  const handleBlur = () => {
    stop();
    if (recordedValue) {
      onValueChange(recordedValue);
    }
  };

  const clear = () => {
    stop();
    resetKeys();
    onValueChange("");
  };

  return (
    <div className={cn("relative", className)}>
      <Input
        {...props}
        value={displayValue}
        readOnly
        placeholder={isRecording ? "Recording..." : placeholder}
        className="pr-8 font-mono"
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      <HotkeyClearButton visible={Boolean(value)} onClear={clear} />
    </div>
  );
}

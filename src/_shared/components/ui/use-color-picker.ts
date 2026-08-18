import { useEffect, useState } from "react";
import { normalizeHexColor } from "@/_shared/components/ui/color-picker.lib";

const FALLBACK_COLOR = "#3b82f6";

export function useColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  const color = normalizeHexColor(value) ?? FALLBACK_COLOR;
  const [draft, setDraft] = useState(color);

  useEffect(() => {
    setDraft(color);
  }, [color]);

  return {
    color,
    draft,
    handlePickerChange: (next: string) => {
      const hex = normalizeHexColor(next);
      if (!hex) {
        return;
      }
      setDraft(hex);
      onChange(hex);
    },
    handleDraftChange: (next: string) => {
      setDraft(next);
      const hex = normalizeHexColor(next);
      if (hex) {
        onChange(hex);
      }
    },
  };
}

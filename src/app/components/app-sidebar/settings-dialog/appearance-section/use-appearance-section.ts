import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";

export const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

export type ThemeOption = (typeof THEME_OPTIONS)[number]["value"];

function isThemeOption(value: string): value is ThemeOption {
  return THEME_OPTIONS.some((option) => option.value === value);
}

export function useAppearanceSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const value: ThemeOption = mounted && theme && isThemeOption(theme) ? theme : "light";

  const onThemeChange = useCallback(
    (next: string | null) => {
      if (next && isThemeOption(next)) {
        setTheme(next);
      }
    },
    [setTheme],
  );

  return {
    mounted,
    onThemeChange,
    value,
  };
}

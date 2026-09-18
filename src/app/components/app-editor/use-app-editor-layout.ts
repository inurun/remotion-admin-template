import { useEffect, useState } from "react";
import { useDefaultLayout } from "react-resizable-panels";

const APP_EDITOR_LAYOUT_ID = "app-editor-layout";
const APP_EDITOR_SHELL_LAYOUT_ID = "app-editor-shell";
export const DESKTOP_EDITOR_LAYOUT_QUERY = "(min-width: 1024px)";

export function getDesktopEditorLayout(
  media: { matchMedia: (query: string) => { matches: boolean } } | undefined = typeof window ===
  "undefined"
    ? undefined
    : window,
) {
  return media?.matchMedia(DESKTOP_EDITOR_LAYOUT_QUERY).matches ?? false;
}

export function useDesktopEditorLayout() {
  const [isDesktop, setIsDesktop] = useState(() => getDesktopEditorLayout());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const media = window.matchMedia(DESKTOP_EDITOR_LAYOUT_QUERY);
    const onChange = () => setIsDesktop(media.matches);
    media.addEventListener("change", onChange);
    setIsDesktop(media.matches);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

export function useAppEditorLayout() {
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: APP_EDITOR_LAYOUT_ID,
  });
  const { defaultLayout: defaultShellLayout, onLayoutChanged: onShellLayoutChanged } =
    useDefaultLayout({
      id: APP_EDITOR_SHELL_LAYOUT_ID,
    });

  return {
    defaultLayout,
    defaultShellLayout,
    id: APP_EDITOR_LAYOUT_ID,
    onLayoutChanged,
    onShellLayoutChanged,
    shellId: APP_EDITOR_SHELL_LAYOUT_ID,
  };
}

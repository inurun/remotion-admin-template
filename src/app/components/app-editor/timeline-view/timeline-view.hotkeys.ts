import { useHotkeys } from "react-hotkeys-hook";

export function useTimelineViewHotkeys({
  enabled,
  onNudge,
}: {
  enabled: boolean;
  onNudge: (delta: number) => void;
}) {
  useHotkeys(
    "arrowleft",
    (event) => {
      event.preventDefault();
      onNudge(-1);
    },
    { enabled, preventDefault: true },
    [enabled, onNudge],
  );
  useHotkeys(
    "arrowright",
    (event) => {
      event.preventDefault();
      onNudge(1);
    },
    { enabled, preventDefault: true },
    [enabled, onNudge],
  );
}

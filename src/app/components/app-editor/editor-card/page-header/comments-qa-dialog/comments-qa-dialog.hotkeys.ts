import { useHotkeys } from "react-hotkeys-hook";
import { useSettings } from "@/app/features/settings";

export function useCommentsQaDialogHotkeys({
  enabled,
  onDone,
}: {
  enabled: boolean;
  onDone: () => void;
}) {
  const { hotkeys } = useSettings();

  useHotkeys(
    hotkeys.commentsQaDone,
    (event) => {
      event.preventDefault();
      onDone();
    },
    {
      enableOnContentEditable: true,
      enableOnFormTags: true,
      preventDefault: true,
      enabled: enabled && Boolean(hotkeys.commentsQaDone),
    },
    [enabled, hotkeys.commentsQaDone, onDone],
  );
}

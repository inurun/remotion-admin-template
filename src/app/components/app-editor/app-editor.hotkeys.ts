import { useHotkeys } from "react-hotkeys-hook";
import { useEditor } from "@/app/features/editor";
import { useSettings } from "@/app/features/settings";

export function useAppEditorHotkeys() {
  const { save } = useEditor();
  const { hotkeys } = useSettings();

  useHotkeys(
    hotkeys.save,
    (event) => {
      event.preventDefault();
      save();
    },
    {
      enableOnContentEditable: true,
      enableOnFormTags: true,
      preventDefault: true,
      enabled: Boolean(hotkeys.save),
    },
    [hotkeys.save, save],
  );
}

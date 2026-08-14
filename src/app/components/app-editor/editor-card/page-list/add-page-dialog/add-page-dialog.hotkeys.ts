import { useHotkeys } from "react-hotkeys-hook";
import { useSettings } from "@/app/features/settings";

export function useAddPageDialogHotkeys(openDialog: () => void) {
  const { hotkeys } = useSettings();

  useHotkeys(
    hotkeys.addPage,
    (event) => {
      event.preventDefault();
      openDialog();
    },
    {
      enableOnContentEditable: true,
      enableOnFormTags: true,
      preventDefault: true,
      enabled: Boolean(hotkeys.addPage),
    },
    [hotkeys.addPage, openDialog],
  );
}

import { RotateCcw } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/_shared/components/ui/button";
import { HotkeyInput } from "@/_shared/components/ui/hotkey-input";
import { APP_HOTKEY_LABELS } from "@/app/features/settings";
import type { SettingsFormValues } from "@/app/components/app-sidebar/settings-dialog/use-settings-dialog";
import { useHotkeysSection } from "@/app/components/app-sidebar/settings-dialog/hotkeys-section/use-hotkeys-section";

export function HotkeysSection({ form }: { form: UseFormReturn<SettingsFormValues> }) {
  const hotkeys = useHotkeysSection(form);

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Hotkeys</h3>
        <Button type="button" size="sm" variant="outline" onClick={hotkeys.resetHotkeys}>
          <RotateCcw />
          Reset hotkeys
        </Button>
      </div>
      <div className="grid gap-2">
        {hotkeys.actions.map((action) => {
          const error = hotkeys.getAppHotkeyError(action);
          return (
            <label
              key={action}
              className="grid grid-cols-[minmax(0,1fr)_160px] items-center gap-3 text-sm"
            >
              <span>{APP_HOTKEY_LABELS[action]}</span>
              <span className="grid gap-1">
                <HotkeyInput
                  value={hotkeys.hotkeys[action]}
                  aria-invalid={Boolean(error)}
                  onValueChange={(value) => hotkeys.setAppHotkey(action, value)}
                />
                {error ? <span className="text-xs text-destructive">{error}</span> : null}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

import { Settings } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/_shared/components/ui/dialog";
import { Separator } from "@/_shared/components/ui/separator";
import { AppearanceSection } from "@/app/components/app-sidebar/settings-dialog/appearance-section/appearance-section";
import { HotkeysSection } from "@/app/components/app-sidebar/settings-dialog/hotkeys-section/hotkeys-section";
import { useSettingsDialog } from "@/app/components/app-sidebar/settings-dialog/use-settings-dialog";
import { VoicesSection } from "@/app/components/app-sidebar/settings-dialog/voices-section/voices-section";

export function SettingsDialog() {
  const dialog = useSettingsDialog();

  return (
    <Dialog open={dialog.open} onOpenChange={dialog.handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            title="Settings"
            aria-label="Settings"
          />
        }
      >
        <Settings />
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,760px)]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5">
          <AppearanceSection />
          <Separator />
          <VoicesSection form={dialog.form} settingsOpen={dialog.open} />
          <Separator />
          <HotkeysSection form={dialog.form} />
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
          <Button type="button" disabled={!dialog.canSave} onClick={dialog.save}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

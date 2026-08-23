import { Settings } from "lucide-react";
import { Controller } from "react-hook-form";
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
import { Field, FieldError } from "@/_shared/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/_shared/components/ui/select";
import { Textarea } from "@/_shared/components/ui/textarea";
import { VIDEO_SIZE_PRESETS } from "@/constants";
import { useProjectSettingsDialog } from "@/app/components/app-header/project-settings-dialog/use-project-settings-dialog";

export function ProjectSettingsDialog() {
  const dialog = useProjectSettingsDialog();

  return (
    <Dialog open={dialog.open} onOpenChange={dialog.handleOpenChange}>
      <DialogTrigger
        render={<Button type="button" size="icon-sm" variant="ghost" title="Project settings" />}
      >
        <Settings />
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,520px)] max-h-[90vh] overflow-y-auto">
        <form className="grid gap-4" onSubmit={(event) => void dialog.submit(event)}>
          <DialogHeader>
            <DialogTitle>Project Settings</DialogTitle>
          </DialogHeader>
          <Field data-invalid={Boolean(dialog.form.formState.errors.title)}>
            <label className="grid gap-2 text-sm font-medium">
              Title
              <Textarea autoFocus rows={2} {...dialog.form.register("title")} />
            </label>
            <FieldError errors={[dialog.form.formState.errors.title]} />
          </Field>
          <Field data-invalid={Boolean(dialog.form.formState.errors.description)}>
            <label className="grid gap-2 text-sm font-medium">
              Description
              <Textarea rows={3} {...dialog.form.register("description")} />
            </label>
            <FieldError errors={[dialog.form.formState.errors.description]} />
          </Field>
          <Controller
            control={dialog.form.control}
            name="videoSizePreset"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <label className="grid gap-2 text-sm font-medium">
                  Video size
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-invalid={fieldState.invalid} className="w-full">
                      <SelectValue placeholder="Video size" />
                    </SelectTrigger>
                    <SelectContent>
                      {VIDEO_SIZE_PRESETS.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.label} {preset.width}x{preset.height}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Button
            type="button"
            variant="destructive"
            disabled={dialog.isPending || dialog.isClearingTts}
            onClick={() => void dialog.clearTtsCache()}
          >
            {dialog.isClearingTts ? "Clearing" : "Clear TTS cache"}
          </Button>
          <DialogFooter>
            <DialogClose
              render={<Button type="button" variant="outline" disabled={dialog.isPending} />}
            >
              Cancel
            </DialogClose>
            <Button type="submit" disabled={dialog.isPending}>
              {dialog.isPending ? "Saving" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

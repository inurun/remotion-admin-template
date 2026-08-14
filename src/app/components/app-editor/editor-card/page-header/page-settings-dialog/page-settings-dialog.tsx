import { Plus, Settings, Trash2 } from "lucide-react";
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
import { Input } from "@/_shared/components/ui/input";
import { usePageSettingsDialog } from "@/app/components/app-editor/editor-card/page-header/page-settings-dialog/use-page-settings-dialog";

export function PageSettingsDialog() {
  const dialog = usePageSettingsDialog();

  return (
    <Dialog open={dialog.open} onOpenChange={dialog.handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            title="Page settings"
            aria-label="Page settings"
          />
        }
      >
        <Settings />
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,420px)]">
        <form className="grid gap-4" onSubmit={(event) => void dialog.submit(event)}>
          <DialogHeader>
            <DialogTitle>Page Settings</DialogTitle>
          </DialogHeader>
          <Field data-invalid={Boolean(dialog.form.formState.errors.title)}>
            <label className="grid gap-2 text-sm font-medium">
              Title
              <Input autoFocus {...dialog.form.register("title")} />
            </label>
            <FieldError errors={[dialog.form.formState.errors.title]} />
          </Field>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tags</span>
              <Button type="button" size="sm" variant="outline" onClick={dialog.addTag}>
                <Plus />
                Add tag
              </Button>
            </div>
            {dialog.tagFields.map((field, index) => {
              const error = dialog.form.formState.errors.tags?.[index]?.value;
              return (
                <Field key={field.id} data-invalid={Boolean(error)}>
                  <div className="flex gap-2">
                    <Input
                      aria-invalid={Boolean(error)}
                      placeholder="Tag"
                      {...dialog.form.register(`tags.${index}.value`)}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      title="Remove tag"
                      onClick={() => dialog.removeTag(index)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <FieldError errors={[error]} />
                </Field>
              );
            })}
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

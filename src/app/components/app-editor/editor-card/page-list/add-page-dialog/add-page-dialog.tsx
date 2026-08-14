import { Controller } from "react-hook-form";
import { FilePlus2 } from "lucide-react";
import { useCallback } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/_shared/components/ui/select";
import { useAddPageDialogHotkeys } from "@/app/components/app-editor/editor-card/page-list/add-page-dialog/add-page-dialog.hotkeys";
import { useAddPageDialog } from "@/app/components/app-editor/editor-card/page-list/add-page-dialog/use-add-page-dialog";

export function AddPageDialog() {
  const dialog = useAddPageDialog();
  const { handleOpenChange } = dialog;
  const openDialog = useCallback(() => {
    handleOpenChange(true);
  }, [handleOpenChange]);
  useAddPageDialogHotkeys(openDialog);

  return (
    <Dialog open={dialog.open} onOpenChange={dialog.handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            title="ページ追加"
            aria-label="ページ追加"
            variant="secondary"
          />
        }
      >
        <FilePlus2 className="size-3" />
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,420px)]">
        <form className="grid gap-4" onSubmit={(event) => void dialog.submit(event)}>
          <DialogHeader>
            <DialogTitle>Add Page</DialogTitle>
          </DialogHeader>
          <Controller
            name="type"
            control={dialog.form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <label className="grid gap-2 text-sm font-medium">
                  Type
                  <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-invalid={fieldState.invalid} className="w-full">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {dialog.typeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          {dialog.isTransitionType ? null : (
            <Field data-invalid={Boolean(dialog.form.formState.errors.title)}>
              <label className="grid gap-2 text-sm font-medium">
                Title
                <Input autoFocus {...dialog.form.register("title")} />
              </label>
              <FieldError errors={[dialog.form.formState.errors.title]} />
            </Field>
          )}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit">Add</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

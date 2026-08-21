import { Tv } from "lucide-react";
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
import { Textarea } from "@/_shared/components/ui/textarea";
import { useNiconicoDialog } from "./use-niconico-dialog";

export function NiconicoDialog() {
  const dialog = useNiconicoDialog();

  return (
    <Dialog open={dialog.open} onOpenChange={dialog.handleOpenChange}>
      <DialogTrigger
        render={<Button type="button" size="icon-sm" variant="ghost" title="Niconico" />}
      >
        <Tv />
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,520px)] max-h-[90vh] overflow-y-auto">
        <form className="grid gap-4" onSubmit={(event) => void dialog.submit(event)}>
          <DialogHeader>
            <DialogTitle>Niconico</DialogTitle>
          </DialogHeader>
          <Field data-invalid={Boolean(dialog.form.formState.errors.title)}>
            <label className="grid gap-2 text-sm font-medium">
              Title
              <Input {...dialog.form.register("title")} />
            </label>
            <FieldError errors={[dialog.form.formState.errors.title]} />
          </Field>
          <Field data-invalid={Boolean(dialog.form.formState.errors.description)}>
            <label className="grid gap-2 text-sm font-medium">
              Description
              <Textarea rows={4} {...dialog.form.register("description")} />
            </label>
            <FieldError errors={[dialog.form.formState.errors.description]} />
          </Field>
          <Field data-invalid={Boolean(dialog.form.formState.errors.thumbnailTime)}>
            <label className="grid gap-2 text-sm font-medium">
              Thumbnail time
              <Input placeholder="00:00.000" {...dialog.form.register("thumbnailTime")} />
            </label>
            <FieldError errors={[dialog.form.formState.errors.thumbnailTime]} />
          </Field>
          <Field data-invalid={Boolean(dialog.form.formState.errors.parentWorkIds)}>
            <label className="grid gap-2 text-sm font-medium">
              Parent works
              <Textarea
                rows={3}
                placeholder="sm9 ss123"
                {...dialog.form.register("parentWorkIds")}
              />
            </label>
            <FieldError errors={[dialog.form.formState.errors.parentWorkIds]} />
          </Field>
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

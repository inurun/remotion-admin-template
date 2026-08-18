import type { SavedScheduleItem } from "@/_schemas";
import { Button } from "@/_shared/components/ui/button";
import { ColorPicker } from "@/_shared/components/ui/color-picker";
import { Field, FieldError } from "@/_shared/components/ui/field";
import { Input } from "@/_shared/components/ui/input";
import { Textarea } from "@/_shared/components/ui/textarea";
import type { ScheduleFormValues } from "@/app/features/schedule";
import { useScheduleForm } from "@/app/components/app-schedule/schedule-day-popover/schedule-form/use-schedule-form";

export function ScheduleForm({
  date,
  item,
  pending,
  onSubmit,
  onDelete,
}: {
  date: string;
  item: SavedScheduleItem | null;
  pending: boolean;
  onSubmit: (values: ScheduleFormValues) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const form = useScheduleForm({ date, item, onSubmit, onDelete });

  return (
    <form className="grid gap-2" onSubmit={(event) => void form.submit(event)}>
      <ColorPicker value={form.color} onChange={form.setColor} />
      <Field data-invalid={Boolean(form.form.formState.errors.title)}>
        <Input placeholder="Title" autoFocus {...form.form.register("title")} />
        <FieldError errors={[form.form.formState.errors.title]} />
      </Field>
      <Field data-invalid={Boolean(form.form.formState.errors.description)}>
        <Textarea rows={3} placeholder="Notes" {...form.form.register("description")} />
        <FieldError errors={[form.form.formState.errors.description]} />
      </Field>
      <div className="flex justify-end gap-1.5">
        {form.remove ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => void form.remove?.()}
          >
            Delete
          </Button>
        ) : null}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving" : item ? "Save" : "Add"}
        </Button>
      </div>
    </form>
  );
}

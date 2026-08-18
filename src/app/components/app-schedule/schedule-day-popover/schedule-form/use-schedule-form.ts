import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { SavedScheduleItem } from "@/_schemas";
import {
  DEFAULT_SCHEDULE_COLOR,
  scheduleFormSchema,
  type ScheduleFormValues,
} from "@/app/features/schedule";

export function useScheduleForm({
  date,
  item,
  onSubmit,
  onDelete,
}: {
  date: string;
  item: SavedScheduleItem | null;
  onSubmit: (values: ScheduleFormValues) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      id: item?.id,
      date: item?.date ?? date,
      color: item?.color ?? DEFAULT_SCHEDULE_COLOR,
      title: item?.title ?? "",
      description: item?.description ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      id: item?.id,
      date: item?.date ?? date,
      color: item?.color ?? DEFAULT_SCHEDULE_COLOR,
      title: item?.title ?? "",
      description: item?.description ?? "",
    });
  }, [date, form, item]);

  return {
    form,
    color: form.watch("color"),
    setColor: (color: string) => {
      form.setValue("color", color, { shouldDirty: true, shouldValidate: true });
    },
    submit: form.handleSubmit(async (values) => {
      await onSubmit(values);
      if (!values.id) {
        form.reset({
          date: values.date,
          color: DEFAULT_SCHEDULE_COLOR,
          title: "",
          description: "",
        });
      }
    }),
    remove: item && onDelete ? () => onDelete(item.id) : undefined,
  };
}

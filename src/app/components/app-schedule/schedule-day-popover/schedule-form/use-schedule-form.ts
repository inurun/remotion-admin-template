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
      startDate: item?.startDate ?? date,
      endDate: item?.endDate ?? date,
      color: item?.color ?? DEFAULT_SCHEDULE_COLOR,
      title: item?.title ?? "",
      description: item?.description ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      id: item?.id,
      startDate: item?.startDate ?? date,
      endDate: item?.endDate ?? date,
      color: item?.color ?? DEFAULT_SCHEDULE_COLOR,
      title: item?.title ?? "",
      description: item?.description ?? "",
    });
  }, [date, form, item]);

  return {
    form,
    color: form.watch("color"),
    startDate: form.watch("startDate"),
    endDate: form.watch("endDate"),
    setColor: (color: string) => {
      form.setValue("color", color, { shouldDirty: true, shouldValidate: true });
    },
    setStartDate: (startDate: string) => {
      form.setValue("startDate", startDate, { shouldDirty: true, shouldValidate: true });
    },
    setEndDate: (endDate: string) => {
      form.setValue("endDate", endDate, { shouldDirty: true, shouldValidate: true });
    },
    submit: form.handleSubmit(async (values) => {
      await onSubmit(values);
      if (!values.id) {
        form.reset({
          startDate: values.startDate,
          endDate: values.startDate,
          color: DEFAULT_SCHEDULE_COLOR,
          title: "",
          description: "",
        });
      }
    }),
    remove: item && onDelete ? () => onDelete(item.id) : undefined,
  };
}

import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import { useCallback, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useFormContext } from "react-hook-form";
import {
  getPageSettingsTags,
  getSelectedPageSettingsFormValues,
  pageSettingsFormSchema,
  toPageSettingsFormValues,
  type PageSettingsFormValues,
} from "./page-settings-dialog.lib";

export function usePageSettingsDialog() {
  const pageForm = useFormContext<PageFormValues>();
  const [open, setOpen] = useState(false);

  const form = useForm<PageSettingsFormValues>({
    resolver: zodResolver(pageSettingsFormSchema),
    defaultValues: toPageSettingsFormValues({ title: "", tags: [] }),
  });
  const {
    fields: tagFields,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: "tags",
  });

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        return;
      }

      form.reset(getSelectedPageSettingsFormValues(pageForm.getValues()));
    },
    [form, pageForm],
  );

  const submit = form.handleSubmit((values) => {
    pageForm.setValue("title", values.title, {
      shouldDirty: true,
      shouldValidate: true,
    });
    pageForm.setValue("meta.tags", getPageSettingsTags(values), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setOpen(false);
  });

  const addTag = useCallback(() => {
    append({ value: "" });
  }, [append]);

  return {
    addTag,
    form,
    open,
    removeTag: remove,
    tagFields,
    handleOpenChange,
    submit,
  };
}

import { useCallback, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useFormContext } from "react-hook-form";
import type { DraftProject } from "@/_schemas";
import { usePage, useSelectedPage } from "@/app/features/page";
import {
  getPageSettingsTags,
  getSelectedPageSettingsFormValues,
  pageSettingsFormSchema,
  toPageSettingsFormValues,
  type PageSettingsFormValues,
} from "./page-settings-dialog.lib";

export function usePageSettingsDialog() {
  const { setValue } = useFormContext<DraftProject>();
  const { selectedPage } = usePage();
  const { selectedPageIndex } = useSelectedPage();
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

      form.reset(getSelectedPageSettingsFormValues(selectedPage));
    },
    [form, selectedPage],
  );

  const submit = form.handleSubmit((values) => {
    setValue(`pages.${selectedPageIndex}.title`, values.title, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(`pages.${selectedPageIndex}.meta.tags`, getPageSettingsTags(values), {
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

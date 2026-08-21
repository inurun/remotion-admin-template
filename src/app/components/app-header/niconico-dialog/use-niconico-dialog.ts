import { useCallback, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEditor, useEditorSession } from "@/app/features/editor";
import {
  fromNiconicoFormValues,
  niconicoFormSchema,
  toNiconicoFormValues,
  type NiconicoFormValues,
} from "./niconico-dialog.lib";

export function useNiconicoDialog() {
  const projectSettings = useEditorSession((state) => state.project);
  const updateProjectSettings = useEditorSession((state) => state.updateProjectSettings);
  const niconico = projectSettings.meta.niconico;
  const { isPending, save } = useEditor();
  const [open, setOpen] = useState(false);
  const form = useForm<NiconicoFormValues>({
    resolver: zodResolver(niconicoFormSchema),
    defaultValues: toNiconicoFormValues(niconico),
  });

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) {
        form.reset(toNiconicoFormValues(niconico));
      }
    },
    [form, niconico],
  );

  const submit = form.handleSubmit(async (values) => {
    updateProjectSettings({
      ...projectSettings,
      meta: {
        ...projectSettings.meta,
        niconico: fromNiconicoFormValues(values),
      },
    });
    await save();
    setOpen(false);
  });

  return {
    form,
    isPending,
    open,
    handleOpenChange,
    submit,
  };
}

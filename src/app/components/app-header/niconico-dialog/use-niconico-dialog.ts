import { useCallback, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { VIDEO_FPS } from "@/constants";
import { useEditor, useEditorSession } from "@/app/features/editor";
import { useRemotionPlayerControl } from "@/app/features/remotion/context/remotion-player-control-context";
import { formatFrameTime } from "@/app/components/app-editor/preview-card/preview-card.lib";
import {
  fromNiconicoFormValues,
  niconicoFormSchema,
  parentWorkIdsInputFromOutroItems,
  toNiconicoFormValues,
  type NiconicoFormValues,
} from "./niconico-dialog.lib";

export function useNiconicoDialog() {
  const projectSettings = useEditorSession((state) => state.project);
  const itemsById = useEditorSession((state) => state.itemsById);
  const updateProjectSettings = useEditorSession((state) => state.updateProjectSettings);
  const niconico = projectSettings.meta.niconico;
  const { isPending, save } = useEditor();
  const playerControl = useRemotionPlayerControl();
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

  const refreshParentWorks = useCallback(() => {
    form.setValue("parentWorkIds", parentWorkIdsInputFromOutroItems(Object.values(itemsById)), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [form, itemsById]);

  const setThumbnailTimeFromPreview = useCallback(() => {
    form.setValue("thumbnailTime", formatFrameTime(playerControl.getCurrentFrame(), VIDEO_FPS), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [form, playerControl]);

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
    refreshParentWorks,
    setThumbnailTimeFromPreview,
    submit,
  };
}

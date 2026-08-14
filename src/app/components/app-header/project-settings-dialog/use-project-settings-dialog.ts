import { useCallback, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import type { DraftProject } from "@/_schemas";
import { VIDEO_SIZE_PRESETS } from "@/constants";
import {
  formatParentWorkIdsInput,
  getProjectVideoSizePresetId,
  normalizeProjectMeta,
  parseParentWorkIdsInput,
  type VideoSizePresetId,
} from "@/_shared/project/project-meta";
import { useEditor } from "@/app/features/editor";
import { useProject } from "@/app/features/project";
import { clearTtsCache } from "@/app/features/tts/api/tts-api";

const projectSettingsFormSchema = z.object({
  title: z.string(),
  description: z.string(),
  videoSizePreset: z.enum(["landscape", "square", "portrait"]),
  niconicoTitle: z.string(),
  niconicoDescription: z.string(),
  niconicoThumbnailTime: z.string(),
  niconicoParentWorkIds: z.string(),
});

type ProjectSettingsFormValues = z.infer<typeof projectSettingsFormSchema>;

function getProjectTitleFallback(projectPath: string | null) {
  return projectPath?.split("/").filter(Boolean).at(-1) ?? "project";
}

function getVideoSizePreset(presetId: VideoSizePresetId) {
  return VIDEO_SIZE_PRESETS.find((preset) => preset.id === presetId) ?? VIDEO_SIZE_PRESETS[0];
}

function createFormValues(meta?: DraftProject["meta"]): ProjectSettingsFormValues {
  const normalizedMeta = normalizeProjectMeta(meta);

  return {
    title: normalizedMeta.title,
    description: normalizedMeta.description,
    videoSizePreset: getProjectVideoSizePresetId(normalizedMeta),
    niconicoTitle: normalizedMeta.niconico.title,
    niconicoDescription: normalizedMeta.niconico.description,
    niconicoThumbnailTime: normalizedMeta.niconico.thumbnailTime,
    niconicoParentWorkIds: formatParentWorkIdsInput(normalizedMeta.niconico.parentWorkIds),
  };
}

export function useProjectSettingsDialog() {
  const { control, setValue } = useFormContext<DraftProject>();
  const { isPending, save } = useEditor();
  const { projectPath } = useProject();
  const meta = useWatch({ control, name: "meta" });
  const [open, setOpen] = useState(false);
  const [isClearingTts, setIsClearingTts] = useState(false);
  const form = useForm<ProjectSettingsFormValues>({
    resolver: zodResolver(projectSettingsFormSchema),
    defaultValues: createFormValues(meta),
  });

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) {
        form.reset(createFormValues(meta));
      }
    },
    [form, meta],
  );

  const submit = form.handleSubmit(async (values) => {
    const preset = getVideoSizePreset(values.videoSizePreset);
    setValue(
      "meta",
      normalizeProjectMeta(
        {
          ...meta,
          title: values.title,
          description: values.description,
          width: preset.width,
          height: preset.height,
          niconico: {
            title: values.niconicoTitle,
            description: values.niconicoDescription,
            thumbnailTime: values.niconicoThumbnailTime,
            parentWorkIds: parseParentWorkIdsInput(values.niconicoParentWorkIds),
          },
        },
        {
          titleFallback: getProjectTitleFallback(projectPath),
        },
      ),
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );
    await save();
    setOpen(false);
  });

  const clearTtsCacheAndResynthesize = useCallback(async () => {
    if (!projectPath || isPending || isClearingTts) {
      return;
    }
    if (!window.confirm("Clear TTS cache and resynthesize on save?")) {
      return;
    }

    setIsClearingTts(true);
    try {
      await clearTtsCache(projectPath);
      await save();
      toast.success("TTS cache cleared and resynthesized");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clear TTS cache");
    } finally {
      setIsClearingTts(false);
    }
  }, [isClearingTts, isPending, projectPath, save]);

  return {
    form,
    isPending,
    isClearingTts,
    open,
    handleOpenChange,
    submit,
    clearTtsCache: clearTtsCacheAndResynthesize,
  };
}

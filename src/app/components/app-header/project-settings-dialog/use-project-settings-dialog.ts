import { useCallback, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import type { ProjectSettingsFormValues } from "@/app/features/project/model/project-settings-form-schema";
import { VIDEO_SIZE_PRESETS } from "@/constants";
import {
  getProjectVideoSizePresetId,
  normalizeProjectMeta,
  type VideoSizePresetId,
} from "@/_shared/project/project-meta";
import { useEditor, useEditorSession } from "@/app/features/editor";
import { useSavedProject } from "@/app/features/editor/store/saved-project-store-context";
import { selectHasPendingTts } from "@/app/features/editor/store/saved-project-state";
import { useProjectRoute } from "@/app/features/project/context/project-route-context";
import {
  getProjectSettingsDialogHref,
  isProjectSettingsRoute,
} from "@/app/features/project/lib/project-route";
import { clearTtsCache } from "@/app/features/tts/api/tts-api";

const projectSettingsDialogFormSchema = z.object({
  title: z.string(),
  description: z.string(),
  videoSizePreset: z.enum(["landscape", "square", "portrait"]),
});

type ProjectSettingsDialogFormValues = z.infer<typeof projectSettingsDialogFormSchema>;

function getProjectTitleFallback(projectPath: string | null) {
  return projectPath?.split("/").filter(Boolean).at(-1) ?? "project";
}

function getVideoSizePreset(presetId: VideoSizePresetId) {
  return VIDEO_SIZE_PRESETS.find((preset) => preset.id === presetId) ?? VIDEO_SIZE_PRESETS[0];
}

function createFormValues(
  meta: ProjectSettingsFormValues["meta"],
): ProjectSettingsDialogFormValues {
  const normalizedMeta = normalizeProjectMeta(meta);

  return {
    title: normalizedMeta.title.replaceAll("\\n", "\n"),
    description: normalizedMeta.description,
    videoSizePreset: getProjectVideoSizePresetId(normalizedMeta),
  };
}

export function useProjectSettingsDialog() {
  const projectSettings = useEditorSession((state) => state.project);
  const sequenceOrder = useEditorSession((state) => state.sequenceOrder);
  const updateProjectSettings = useEditorSession((state) => state.updateProjectSettings);
  const { isPending, save } = useEditor();
  const hasPendingTts = useSavedProject(selectHasPendingTts);
  const [isRetryingPending, setIsRetryingPending] = useState(false);
  const { projectPath, route, navigate } = useProjectRoute();
  const open = isProjectSettingsRoute(route);
  const [isClearingTts, setIsClearingTts] = useState(false);
  const form = useForm<ProjectSettingsDialogFormValues>({
    resolver: zodResolver(projectSettingsDialogFormSchema),
    defaultValues: createFormValues(projectSettings.meta),
  });

  useEffect(() => {
    if (open) {
      form.reset(createFormValues(projectSettings.meta));
    }
  }, [form, open, projectSettings.meta]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!projectPath) {
        return;
      }
      navigate(getProjectSettingsDialogHref(projectPath, nextOpen, sequenceOrder));
    },
    [navigate, projectPath, sequenceOrder],
  );

  const submit = form.handleSubmit(async (values) => {
    const preset = getVideoSizePreset(values.videoSizePreset);
    updateProjectSettings({
      ...projectSettings,
      meta: normalizeProjectMeta(
        {
          ...projectSettings.meta,
          title: values.title,
          description: values.description,
          width: preset.width,
          height: preset.height,
        },
        {
          titleFallback: getProjectTitleFallback(projectPath),
        },
      ),
    });
    await save();
    handleOpenChange(false);
  });

  const retryPendingSynthesis = useCallback(async () => {
    if (!projectPath || isPending || isRetryingPending || !hasPendingTts) {
      return;
    }

    setIsRetryingPending(true);
    try {
      await save({ forceResynthesis: true });
      toast.success("Pending synthesis restarted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to retry synthesis");
    } finally {
      setIsRetryingPending(false);
    }
  }, [hasPendingTts, isPending, isRetryingPending, projectPath, save]);

  const clearTtsCacheAndResynthesize = useCallback(async () => {
    if (!projectPath || isPending || isClearingTts || hasPendingTts) {
      return;
    }
    if (!window.confirm("Clear TTS cache and resynthesize on save?")) {
      return;
    }

    setIsClearingTts(true);
    try {
      await clearTtsCache(projectPath);
      await save({ forceResynthesis: true });
      toast.success("TTS cache cleared; resynthesis started");
      handleOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clear TTS cache");
    } finally {
      setIsClearingTts(false);
    }
  }, [handleOpenChange, hasPendingTts, isClearingTts, isPending, projectPath, save]);

  return {
    form,
    isPending,
    isClearingTts,
    isRetryingPending,
    hasPendingTts,
    open,
    handleOpenChange,
    submit,
    retryPendingSynthesis,
    clearTtsCache: clearTtsCacheAndResynthesize,
  };
}

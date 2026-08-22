import { useCallback, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { getErrorMessage } from "@/_shared/lib/error-message";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import { useEditor } from "@/app/features/editor";
import {
  useProjectRoute,
  useSelectedPageId,
} from "@/app/features/project/context/project-route-context";
import { requestPreviewSynthesis } from "@/app/features/tts/api/tts-api";
import { isTtsActionReady } from "@/app/features/tts/lib/tts-action";
import {
  useAnalyzeTextMutation,
  useLlmAnalyzeMutation,
} from "@/app/features/tts/swr/use-tts-mutations";
import { resolveTtsSynthesisSettings } from "@/_shared/project/voice-presets";
import { useSettings } from "@/app/features/settings";
import { useEditorSession } from "@/app/features/editor/store/editor-session-store-context";
import { useSelectedTtsState } from "@/app/features/tts/context/selected-tts-state";

function useTtsCommands() {
  const form = useFormContext<PageFormValues>();
  const { isPending: saving } = useEditor();
  const { projectPath } = useProjectRoute();
  const { options } = useSettings();
  const voicePresets = useEditorSession((state) => state.project.voicePresets);
  const { trigger: analyzeText, isMutating: isAnalyzing } = useAnalyzeTextMutation();
  const { trigger: analyzeWithLlmRequest, isMutating: isLlmAnalyzing } = useLlmAnalyzeMutation();
  const pageId = useSelectedPageId();
  const canRunTts = options.length > 0 && !saving;
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const playPreview = useCallback(async (audioSrc: string) => {
    previewAudioRef.current?.pause();
    const audio = new Audio(audioSrc);
    previewAudioRef.current = audio;
    await audio.play();
  }, []);

  const getTts = useCallback(
    (ttsId: string) => form.getValues("tts").find((item) => item.id === ttsId),
    [form],
  );

  const analyze = useCallback(
    async (ttsId: string) => {
      const item = getTts(ttsId);
      if (isAnalyzing || isLlmAnalyzing || !isTtsActionReady(item, canRunTts)) {
        return;
      }
      const g2p = await analyzeText({ item });
      const tts = form
        .getValues("tts")
        .map((entry) =>
          entry.id === ttsId
            ? ({ ...entry, speech: { ...entry.speech, g2p } } as TtsFormValues)
            : entry,
        );
      form.setValue("tts", tts, { shouldDirty: true });
      toast.success("音声分析を更新した");
    },
    [analyzeText, canRunTts, form, getTts, isAnalyzing, isLlmAnalyzing],
  );

  const analyzeWithLlm = useCallback(
    async (ttsId: string) => {
      const item = getTts(ttsId);
      if (
        !pageId ||
        isAnalyzing ||
        isLlmAnalyzing ||
        !isTtsActionReady(item, canRunTts) ||
        item.provider === "voicepeak"
      ) {
        return;
      }

      const result = await analyzeWithLlmRequest({
        pageId,
        items: [
          {
            id: item.id,
            provider: item.provider,
            text: item.text,
            ...(item.readText === undefined ? {} : { readText: item.readText }),
          },
        ],
      });
      const target = result.items.find((entry) => entry.id === ttsId);
      if (!target?.g2p || target.status === "skipped") {
        toast.error(target?.reason ?? "LLM G2P skipped");
        return;
      }

      const tts = form
        .getValues("tts")
        .map((entry) =>
          entry.id === ttsId
            ? ({ ...entry, speech: { ...entry.speech, g2p: target.g2p } } as TtsFormValues)
            : entry,
        );
      form.setValue("tts", tts, { shouldDirty: true });
      toast.success(target.status === "corrected" ? "LLM G2P を更新した" : "LLM G2P unchanged");
    },
    [analyzeWithLlmRequest, canRunTts, form, getTts, isAnalyzing, isLlmAnalyzing, pageId],
  );

  const preview = useCallback(
    async (ttsId: string) => {
      const item = getTts(ttsId);
      if (!isTtsActionReady(item, canRunTts)) {
        return;
      }
      if (!projectPath) {
        throw new Error("Project path is required");
      }
      try {
        const resolvedItem = resolveTtsSynthesisSettings(item, voicePresets);
        const audioSrc = await requestPreviewSynthesis(resolvedItem, projectPath);
        await playPreview(audioSrc);
        toast.success("Preview を再生した。");
      } catch (error) {
        toast.error(getErrorMessage(error, "Preview failed"));
      }
    },
    [canRunTts, getTts, playPreview, projectPath, voicePresets],
  );

  return {
    canRunTts,
    isAnalyzing,
    isLlmAnalyzing,
    analyze,
    analyzeWithLlm,
    preview,
  };
}

export function useTtsProviderValue() {
  const selection = useSelectedTtsState();
  const commands = useTtsCommands();

  return {
    selectedTtsId: selection.selectedTtsId,
    selectTts: (ttsId: string) => selection.selectTts(ttsId),
    clearSelection: () => selection.selectTts(null),
    ...commands,
  };
}

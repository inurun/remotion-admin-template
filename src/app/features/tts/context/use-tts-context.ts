import { useCallback, useRef, useState } from "react";
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
import { getAdjacentTtsContext } from "@/app/features/tts/lib/adjacent-tts-context";
import {
  canStartTtsAnalyze,
  canStartTtsLlmAnalyze,
  isTtsActionReady,
} from "@/app/features/tts/lib/tts-action";
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
  const { trigger: analyzeWithLlmRequest } = useLlmAnalyzeMutation();
  const pageId = useSelectedPageId();
  const canRunTts = options.length > 0 && !saving;
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const llmAnalyzingIdsRef = useRef(new Set<string>());
  const [llmAnalyzingIds, setLlmAnalyzingIds] = useState<ReadonlySet<string>>(() => new Set());

  const setLlmAnalyzing = useCallback((ttsId: string, running: boolean) => {
    if (running) {
      llmAnalyzingIdsRef.current.add(ttsId);
    } else {
      llmAnalyzingIdsRef.current.delete(ttsId);
    }
    setLlmAnalyzingIds(new Set(llmAnalyzingIdsRef.current));
  }, []);

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
      if (
        !canStartTtsAnalyze(item, canRunTts, {
          analyzing: isAnalyzing,
          llmIds: llmAnalyzingIdsRef.current,
        })
      ) {
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
    [analyzeText, canRunTts, form, getTts, isAnalyzing],
  );

  const analyzeWithLlm = useCallback(
    async (ttsId: string) => {
      const item = getTts(ttsId);
      if (!canStartTtsLlmAnalyze(item, canRunTts, pageId, llmAnalyzingIdsRef.current) || !pageId) {
        return;
      }

      setLlmAnalyzing(ttsId, true);
      try {
        const result = await analyzeWithLlmRequest({
          pageId,
          items: [
            {
              id: item.id,
              provider: item.provider,
              text: item.text,
              ...(item.readText === undefined ? {} : { readText: item.readText }),
              ...getAdjacentTtsContext(form.getValues("tts"), ttsId),
            },
          ],
        });
        if (!result) {
          return;
        }
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
      } finally {
        setLlmAnalyzing(ttsId, false);
      }
    },
    [analyzeWithLlmRequest, canRunTts, form, getTts, pageId, setLlmAnalyzing],
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
    llmAnalyzingIds,
    analyze,
    analyzeWithLlm,
    preview,
  };
}

export function useTtsProviderValue() {
  const selection = useSelectedTtsState();
  const { llmAnalyzingIds, ...commands } = useTtsCommands();

  return {
    selectedTtsId: selection.selectedTtsId,
    selectTts: (ttsId: string) => selection.selectTts(ttsId),
    clearSelection: () => selection.selectTts(null),
    isLlmAnalyzing: Boolean(
      selection.selectedTtsId && llmAnalyzingIds.has(selection.selectedTtsId),
    ),
    ...commands,
  };
}

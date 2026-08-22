import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { TtsLlmAnalysisResponse } from "@/server/features/tts/contract";
import { getErrorMessage } from "@/_shared/lib/error-message";
import { useSelectedPage } from "@/app/features/page";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import { requestPageLlmAnalysis } from "@/app/features/tts/api/tts-api";
import { applyLlmG2pResults, createLlmG2pSnapshot } from "./llm-g2p-dialog.lib";

function formatResultLogs(result: TtsLlmAnalysisResponse) {
  const lines = [
    `Run: ${result.runId}`,
    `Model: ${result.model}`,
    `Provider: ${result.actualProvider ?? result.provider}`,
    ...(result.requestId ? [`Request: ${result.requestId}`] : []),
    `Timing: haqumei ${result.timings.haqumeiBaselineMs}ms / OpenRouter ${result.timings.openRouterMs}ms / validate ${result.timings.haqumeiValidationMs}ms / total ${result.timings.totalMs}ms`,
    `Tokens: prompt ${result.usage.promptTokens} / completion ${result.usage.completionTokens} / reasoning ${result.usage.reasoningTokens} / cached ${result.usage.cachedTokens}`,
    `Cost: $${result.usage.costUsd.toFixed(6)} / TTS $${result.costPerTtsUsd.toFixed(6)} / 3000 TTS $${result.monthlyUsdAt3000Tts.toFixed(2)}`,
    `Log: ${result.logFile}`,
  ];

  for (const item of result.items) {
    lines.push(`\n[${item.status}] ${item.id}`);
    if (item.baselineKana !== undefined) lines.push(`before: ${item.baselineKana}`);
    if (item.correctedKana !== undefined) lines.push(`after:  ${item.correctedKana}`);
    if (item.reason) lines.push(`reason: ${item.reason}`);
  }
  return lines;
}

export function useLlmG2pDialog() {
  const { pageId } = useSelectedPage();
  const form = useFormContext<PageFormValues>();
  const items = useWatch({ control: form.control, name: "tts" }) ?? [];
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [startedAt, setStartedAt] = useState<number>();
  const [now, setNow] = useState(0);
  const [result, setResult] = useState<TtsLlmAnalysisResponse>();
  const [runSnapshot, setRunSnapshot] = useState<string>();
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [applied, setApplied] = useState(false);
  const currentSnapshot = useMemo(() => createLlmG2pSnapshot(pageId, items), [items, pageId]);
  const stale = Boolean(result && runSnapshot !== currentSnapshot);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => setNow(performance.now()), 100);
    return () => window.clearInterval(timer);
  }, [pending]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setResult(undefined);
      setRunSnapshot(undefined);
      setLogs([]);
      setError(undefined);
      setApplied(false);
    }
  }, []);

  const run = useCallback(async () => {
    const page = form.getValues();
    const snapshot = createLlmG2pSnapshot(pageId, page.tts);
    setPending(true);
    setStartedAt(performance.now());
    setNow(performance.now());
    setResult(undefined);
    setRunSnapshot(snapshot);
    setApplied(false);
    setError(undefined);
    setLogs([`Running ${page.tts.length} TTS: haqumei → OpenRouter → validate`]);
    try {
      const response = await requestPageLlmAnalysis({
        pageId,
        items: page.tts.map((item) => ({
          id: item.id,
          provider: item.provider,
          text: item.text,
          ...(item.readText === undefined ? {} : { readText: item.readText }),
        })),
      });
      setResult(response);
      setLogs(formatResultLogs(response));
    } catch (cause) {
      const message = getErrorMessage(cause, "LLM analyze failed");
      setError(message);
      setLogs((current) => [...current, `Failed: ${message}`]);
    } finally {
      setPending(false);
    }
  }, [form, pageId]);

  const apply = useCallback(() => {
    if (!result || !runSnapshot) return;
    const current = form.getValues();
    if (createLlmG2pSnapshot(pageId, current.tts) !== runSnapshot) {
      setError("Page changed after Run. Run again before Apply.");
      return;
    }
    form.setValue("tts", applyLlmG2pResults(current.tts, result.items), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setApplied(true);
    setError(undefined);
    setLogs((currentLogs) => [...currentLogs, "\nApplied G2P to page."]);
  }, [form, pageId, result, runSnapshot]);

  const canRun = items.some(
    (item) => item.provider !== "voicepeak" && Boolean(item.readText?.trim() || item.text.trim()),
  );

  return {
    open,
    pending,
    logs,
    error,
    stale,
    applied,
    elapsedSec: pending && startedAt ? Math.max(0, now - startedAt) / 1000 : undefined,
    canRun: canRun && !pending,
    canApply: Boolean(result && !stale && !applied && !pending),
    handleOpenChange,
    run,
    apply,
  };
}

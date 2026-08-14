import { useMemo } from "react";
import {
  cloneVoicevoxAudioQuery,
  parseVoicevoxAnalysis,
  serializeVoicevoxAnalysis,
  type VoicevoxAudioQuery,
} from "@/app/components/app-editor/config-card/analysis-field/voicevox-analysis";

function getVoicevoxParseErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to parse VOICEVOX analysis";
}

function getVoicevoxParseState(value?: string) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return { status: "empty" as const };
  }

  try {
    return { status: "ready" as const, query: parseVoicevoxAnalysis(trimmed) };
  } catch (error) {
    return { status: "error" as const, message: getVoicevoxParseErrorMessage(error) };
  }
}

export function useVoicevoxAnalysisEditor(
  value: string | undefined,
  onChange: (value: string) => void,
) {
  const parsed = useMemo(() => getVoicevoxParseState(value), [value]);

  function updateQuery(mutate: (query: VoicevoxAudioQuery) => void) {
    if (parsed.status !== "ready") {
      return;
    }

    const nextQuery = cloneVoicevoxAudioQuery(parsed.query);
    mutate(nextQuery);
    onChange(serializeVoicevoxAnalysis(nextQuery));
  }

  return { parsed, updateQuery };
}

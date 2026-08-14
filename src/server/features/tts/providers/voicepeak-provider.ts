import type { ServerEnv } from "@/server/core/env";
import { analyzeVoicepeakText, synthesizeVoicepeak } from "@/server/features/voicepeak/use-case";
import {
  createDraftComparisonInput,
  createPreviousComparisonInput,
  getOptionalVoiceVersion,
} from "./comparison";
import type { DraftTtsForProvider, SavedTtsForProvider, TtsProviderAdapter } from "./types";

function getVoicepeakReadText(item: { readText?: string; text: string }) {
  return item.readText?.trim() || item.text;
}

export const voicepeakProvider = {
  provider: "voicepeak",
  createComparisonInput(item: DraftTtsForProvider<"voicepeak">) {
    return createDraftComparisonInput("voicepeak", item, getVoicepeakReadText(item));
  },
  createPreviousComparisonInput(item: SavedTtsForProvider<"voicepeak">) {
    return createPreviousComparisonInput("voicepeak", item);
  },
  async analyze(serverEnv: ServerEnv, input) {
    const analysis = await analyzeVoicepeakText(serverEnv, {
      text: input.readText,
    });
    return analysis.analysis;
  },
  synthesize(serverEnv: ServerEnv, input) {
    const voiceVersion = getOptionalVoiceVersion(input.voiceVersion);
    return synthesizeVoicepeak({
      serverEnv,
      projectPath: input.projectPath,
      text: input.readText,
      analysis: input.analysis,
      voiceName: input.voiceName,
      ...(voiceVersion ? { voiceVersion } : {}),
      ...(input.synthesisSettings ? { synthesisSettings: input.synthesisSettings } : {}),
    });
  },
} satisfies TtsProviderAdapter<"voicepeak">;

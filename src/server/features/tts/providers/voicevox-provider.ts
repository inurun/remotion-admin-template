import type { ServerEnv } from "@/server/core/env";
import { analyzeVoicevoxText, synthesizeVoicevox } from "@/server/features/voicevox/use-case";
import {
  createDraftComparisonInput,
  createPreviousComparisonInput,
  getOptionalVoiceVersion,
} from "./comparison";
import type { DraftTtsForProvider, SavedTtsForProvider, TtsProviderAdapter } from "./types";

function getVoicevoxReadText(item: { readText?: string; text: string }) {
  return item.readText?.trim() || item.text;
}

export const voicevoxProvider = {
  provider: "voicevox",
  createComparisonInput(item: DraftTtsForProvider<"voicevox">) {
    return createDraftComparisonInput("voicevox", item, getVoicevoxReadText(item));
  },
  createPreviousComparisonInput(item: SavedTtsForProvider<"voicevox">) {
    return createPreviousComparisonInput("voicevox", item);
  },
  async analyze(serverEnv: ServerEnv, input) {
    const analysis = await analyzeVoicevoxText(serverEnv, {
      text: input.readText,
      voiceName: input.voiceName,
    });
    return analysis.analysis;
  },
  synthesize(serverEnv: ServerEnv, input) {
    const voiceVersion = getOptionalVoiceVersion(input.voiceVersion);
    return synthesizeVoicevox({
      serverEnv,
      projectPath: input.projectPath,
      text: input.readText,
      analysis: input.analysis,
      voiceName: input.voiceName,
      ...(voiceVersion ? { voiceVersion } : {}),
      ...(input.synthesisSettings ? { synthesisSettings: input.synthesisSettings } : {}),
    });
  },
} satisfies TtsProviderAdapter<"voicevox">;

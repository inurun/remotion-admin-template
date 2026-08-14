import type { ServerEnv } from "@/server/core/env";
import { getVoisonaReadText } from "@/server/features/voisona/text";
import { analyzeVoisonaText, synthesizeVoisona } from "@/server/features/voisona/use-case";
import {
  createDraftComparisonInput,
  createPreviousComparisonInput,
  getOptionalVoiceVersion,
} from "./comparison";
import type { DraftTtsForProvider, SavedTtsForProvider, TtsProviderAdapter } from "./types";

export const voisonaProvider = {
  provider: "voisona",
  createComparisonInput(item: DraftTtsForProvider<"voisona">) {
    return createDraftComparisonInput(
      "voisona",
      item,
      getVoisonaReadText(item.text, item.readText),
    );
  },
  createPreviousComparisonInput(item: SavedTtsForProvider<"voisona">) {
    return createPreviousComparisonInput("voisona", item);
  },
  async analyze(serverEnv: ServerEnv, input) {
    const analysis = await analyzeVoisonaText(serverEnv, {
      text: input.readText,
      language: "ja_JP",
    });
    return analysis.analysis;
  },
  synthesize(serverEnv: ServerEnv, input) {
    const voiceVersion = getOptionalVoiceVersion(input.voiceVersion);
    return synthesizeVoisona({
      serverEnv,
      projectPath: input.projectPath,
      text: input.readText,
      analysis: input.analysis,
      voiceName: input.voiceName,
      ...(voiceVersion ? { voiceVersion } : {}),
      ...(input.synthesisSettings ? { synthesisSettings: input.synthesisSettings } : {}),
    });
  },
} satisfies TtsProviderAdapter<"voisona">;

import type { ServerEnv } from "@/server/core/env";
import { synthesizeVoicepeak } from "@/server/features/voicepeak/use-case";
import {
  createDraftComparisonInput,
  createPreviousComparisonInput,
  getEffectiveReadText,
  getOptionalVoiceVersion,
} from "./comparison";
import type { TtsInputForProvider, SavedTtsForProvider, TtsProviderAdapter } from "./types";

export const voicepeakProvider = {
  provider: "voicepeak",
  usesG2p: false,
  createComparisonInput(item: TtsInputForProvider<"voicepeak">) {
    return createDraftComparisonInput("voicepeak", item, getEffectiveReadText(item));
  },
  createPreviousComparisonInput(item: SavedTtsForProvider<"voicepeak">) {
    return createPreviousComparisonInput("voicepeak", item);
  },
  synthesize(serverEnv: ServerEnv, input) {
    const voiceVersion = getOptionalVoiceVersion(input.voiceVersion);
    return synthesizeVoicepeak({
      serverEnv,
      projectPath: input.projectPath,
      text: input.readText,
      voiceName: input.voiceName,
      ...(voiceVersion ? { voiceVersion } : {}),
      ...(input.synthesisSettings ? { synthesisSettings: input.synthesisSettings } : {}),
    });
  },
} satisfies TtsProviderAdapter<"voicepeak">;

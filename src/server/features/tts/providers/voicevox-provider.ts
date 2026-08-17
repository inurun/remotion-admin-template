import type { ServerEnv } from "@/server/core/env";
import { synthesizeVoicevox } from "@/server/features/haqumei-api/synthesis";
import {
  createDraftComparisonInput,
  createPreviousComparisonInput,
  getEffectiveReadText,
  getOptionalVoiceVersion,
} from "./comparison";
import type { TtsInputForProvider, SavedTtsForProvider, TtsProviderAdapter } from "./types";

export const voicevoxProvider = {
  provider: "voicevox",
  usesG2p: true,
  createComparisonInput(item: TtsInputForProvider<"voicevox">) {
    return createDraftComparisonInput("voicevox", item, getEffectiveReadText(item));
  },
  createPreviousComparisonInput(item: SavedTtsForProvider<"voicevox">) {
    return createPreviousComparisonInput("voicevox", item);
  },
  synthesize(serverEnv: ServerEnv, input) {
    if (!input.g2p) {
      throw new Error("VOICEVOX synthesis requires g2p");
    }

    const voiceVersion = getOptionalVoiceVersion(input.voiceVersion);
    return synthesizeVoicevox({
      serverEnv,
      projectPath: input.projectPath,
      g2p: input.g2p,
      voiceName: input.voiceName,
      ...(voiceVersion ? { voiceVersion } : {}),
      ...(input.synthesisSettings ? { synthesisSettings: input.synthesisSettings } : {}),
    });
  },
} satisfies TtsProviderAdapter<"voicevox">;

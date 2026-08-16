import type { ServerEnv } from "@/server/core/env";
import { synthesizeVoisona } from "@/server/features/haqumei-api/synthesis";
import {
  createDraftComparisonInput,
  createPreviousComparisonInput,
  getEffectiveReadText,
  getOptionalVoiceVersion,
} from "./comparison";
import type { DraftTtsForProvider, SavedTtsForProvider, TtsProviderAdapter } from "./types";

export const voisonaProvider = {
  provider: "voisona",
  usesG2p: true,
  createComparisonInput(item: DraftTtsForProvider<"voisona">) {
    return createDraftComparisonInput("voisona", item, getEffectiveReadText(item));
  },
  createPreviousComparisonInput(item: SavedTtsForProvider<"voisona">) {
    return createPreviousComparisonInput("voisona", item);
  },
  synthesize(serverEnv: ServerEnv, input) {
    if (!input.g2p) {
      throw new Error("VoiSona synthesis requires g2p");
    }

    const voiceVersion = getOptionalVoiceVersion(input.voiceVersion);
    return synthesizeVoisona({
      serverEnv,
      projectPath: input.projectPath,
      g2p: input.g2p,
      voiceName: input.voiceName,
      ...(voiceVersion ? { voiceVersion } : {}),
      ...(input.synthesisSettings ? { synthesisSettings: input.synthesisSettings } : {}),
    });
  },
} satisfies TtsProviderAdapter<"voisona">;

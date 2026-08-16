import fs from "node:fs/promises";
import type { VoiceOption, VoicepeakSynthesisSettings } from "@/_schemas";
import type { ServerEnv } from "@/server/core/env";
import { synthesizeWithWavCache } from "@/server/features/tts/wav-cache";
import { getVoicepeakPath, listNarrators, runVoicepeakSynthesis } from "./cli";
import { voicepeakSynthesizeRequestSchema } from "./contract";
import {
  DEFAULT_KASANE_TETO_EMOTION,
  DEFAULT_VOICEPEAK_PITCH,
  DEFAULT_VOICEPEAK_SPEED,
  KASANE_TETO_NARRATOR,
} from "./defaults";

function toVoiceOptions(narrators: string[]): VoiceOption[] {
  return narrators.map((narrator) => ({
    provider: "voicepeak" as const,
    voiceName: narrator,
    displayName: narrator,
  }));
}

export function getVoicepeakBase(serverEnv: ServerEnv) {
  return getVoicepeakPath(serverEnv);
}

export async function listVoicepeakVoices(serverEnv: ServerEnv) {
  return toVoiceOptions(await listNarrators(serverEnv));
}

function resolveSynthesisSettings(
  narrator: string,
  synthesisSettings: VoicepeakSynthesisSettings | null | undefined,
) {
  const speed = synthesisSettings?.speed ?? DEFAULT_VOICEPEAK_SPEED;
  const pitch = synthesisSettings?.pitch ?? DEFAULT_VOICEPEAK_PITCH;
  const emotion =
    synthesisSettings?.emotion ??
    (narrator === KASANE_TETO_NARRATOR ? { ...DEFAULT_KASANE_TETO_EMOTION } : undefined);

  return { speed, pitch, emotion };
}

export async function synthesizeVoicepeak(input: {
  serverEnv: ServerEnv;
  projectPath: string;
  text: string;
  voiceName: string;
  voiceVersion?: string;
  synthesisSettings?: VoicepeakSynthesisSettings;
}) {
  const { serverEnv, projectPath, ...payload } = input;
  const parsed = voicepeakSynthesizeRequestSchema.parse(payload);
  const resolved = resolveSynthesisSettings(parsed.voiceName, parsed.synthesisSettings);

  return synthesizeWithWavCache({
    projectPath,
    cacheKey: {
      provider: "voicepeak",
      text: parsed.text,
      voiceName: parsed.voiceName,
      voiceVersion: parsed.voiceVersion,
      speed: resolved.speed,
      pitch: resolved.pitch,
      emotion: resolved.emotion,
    },
    writeWav: async (outputPath) => {
      try {
        await runVoicepeakSynthesis(serverEnv, {
          text: parsed.text,
          narrator: parsed.voiceName,
          outputPath,
          ...(resolved.emotion ? { emotion: resolved.emotion } : {}),
          speed: resolved.speed,
          pitch: resolved.pitch,
        });
      } catch (error) {
        await fs.unlink(outputPath).catch(() => {});
        throw error;
      }
    },
  });
}

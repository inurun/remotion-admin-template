import fs from "node:fs/promises";
import type { G2pItem, VoicevoxSynthesisSettings, VoisonaSynthesisSettings } from "@/_schemas";
import type { ServerEnv } from "@/server/core/env";
import { planWav, synthesizeWithWavCache } from "@/server/features/tts/wav-cache";
import type { PlannedSynthesis } from "@/server/features/tts/providers/types";
import { getHaqumeiApiClient, unwrapHaqumeiData } from "./client";
import { buildVoicevoxSynthesisRequest, buildVoisonaSynthesisRequest } from "./synthesis-settings";

function parseSpeakerId(voiceName: string) {
  const speaker = Number(voiceName);
  if (!Number.isInteger(speaker)) {
    throw new Error(`VOICEVOX voiceName must be a style id: ${voiceName}`);
  }

  return speaker;
}

async function writeWavFromBlob(outputPath: string, audio: Blob) {
  await fs.writeFile(outputPath, new Uint8Array(await audio.arrayBuffer()));
}

export function planVoicevoxSynthesis(input: {
  serverEnv: ServerEnv;
  projectPath: string;
  g2p: G2pItem;
  voiceName: string;
  voiceVersion?: string;
  synthesisSettings?: VoicevoxSynthesisSettings;
}): PlannedSynthesis {
  const speaker = parseSpeakerId(input.voiceName);
  const body = buildVoicevoxSynthesisRequest({
    item: input.g2p,
    speaker,
    synthesisSettings: input.synthesisSettings,
  });
  const wav = planWav({
    projectPath: input.projectPath,
    cacheKey: {
      provider: "voicevox",
      g2p: input.g2p,
      voiceName: input.voiceName,
      voiceVersion: input.voiceVersion,
      synthesisSettings: body.synthesis_settings,
    },
  });

  return {
    wav,
    run: () =>
      synthesizeWithWavCache({
        wav,
        writeWav: async (outputPath) => {
          const response = await getHaqumeiApiClient(input.serverEnv).POST(
            "/v1/synthesis/voicevox",
            {
              body,
              parseAs: "blob",
            },
          );
          await writeWavFromBlob(outputPath, unwrapHaqumeiData(response));
        },
      }),
  };
}

export function synthesizeVoicevox(input: {
  serverEnv: ServerEnv;
  projectPath: string;
  g2p: G2pItem;
  voiceName: string;
  voiceVersion?: string;
  synthesisSettings?: VoicevoxSynthesisSettings;
}) {
  return planVoicevoxSynthesis(input).run();
}

export function planVoisonaSynthesis(input: {
  serverEnv: ServerEnv;
  projectPath: string;
  g2p: G2pItem;
  voiceName: string;
  voiceVersion?: string;
  synthesisSettings?: VoisonaSynthesisSettings;
}): PlannedSynthesis {
  const body = buildVoisonaSynthesisRequest({
    item: input.g2p,
    voiceName: input.voiceName,
    voiceVersion: input.voiceVersion,
    synthesisSettings: input.synthesisSettings,
  });
  const wav = planWav({
    projectPath: input.projectPath,
    cacheKey: {
      provider: "voisona",
      g2p: input.g2p,
      voiceName: input.voiceName,
      voiceVersion: input.voiceVersion,
      synthesisSettings: body.synthesis_settings,
    },
  });

  return {
    wav,
    run: () =>
      synthesizeWithWavCache({
        wav,
        writeWav: async (outputPath) => {
          const response = await getHaqumeiApiClient(input.serverEnv).POST(
            "/v1/synthesis/voisona",
            {
              body,
              parseAs: "blob",
            },
          );
          await writeWavFromBlob(outputPath, unwrapHaqumeiData(response));
        },
      }),
  };
}

export function synthesizeVoisona(input: {
  serverEnv: ServerEnv;
  projectPath: string;
  g2p: G2pItem;
  voiceName: string;
  voiceVersion?: string;
  synthesisSettings?: VoisonaSynthesisSettings;
}) {
  return planVoisonaSynthesis(input).run();
}

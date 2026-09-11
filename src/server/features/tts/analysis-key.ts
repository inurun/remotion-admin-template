import crypto from "node:crypto";
import { stableStringify } from "@/server/_shared/stable-stringify";
import { AUTOMATIC_LLM_G2P_PROFILE } from "@/server/features/tts/llm-g2p-profile";

export const AUTOMATIC_G2P_ANALYSIS_VERSION = "automatic-g2p-v1";

export function createTtsAnalysisKey(input: {
  projectPath: string;
  pageId: string;
  ttsId: string;
  provider: string;
  text: string;
  effectiveReadText: string;
  baselineKana: string;
}) {
  return crypto
    .createHash("md5")
    .update(
      stableStringify({
        version: AUTOMATIC_G2P_ANALYSIS_VERSION,
        projectPath: input.projectPath,
        pageId: input.pageId,
        ttsId: input.ttsId,
        provider: input.provider,
        text: input.text,
        effectiveReadText: input.effectiveReadText,
        baselineKana: input.baselineKana,
        automaticProfileId: AUTOMATIC_LLM_G2P_PROFILE.id,
      }),
    )
    .digest("hex");
}

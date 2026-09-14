import { analyzeItemSchema, type AnalyzeItem } from "@/_schemas";
import type { ServerEnv } from "@/server/core/env";
import { getHaqumeiApiClient, unwrapHaqumeiData } from "./client";
import { HaqumeiApiError } from "./error";
import { assertHaqumeiTextLength, chunkAnalyzeTexts, HAQUMEI_SCHEMA_VERSION } from "./limits";

async function requestAnalyze(serverEnv: ServerEnv, texts: string[]): Promise<AnalyzeItem[]> {
  const response = await getHaqumeiApiClient(serverEnv).POST("/v1/analyze", {
    body: { texts },
  });
  const data = unwrapHaqumeiData(response);
  if (data.schema_version !== HAQUMEI_SCHEMA_VERSION) {
    throw new Error(`haqumei-api analyze returned schema_version ${data.schema_version}`);
  }
  if (data.items.length !== texts.length) {
    throw new Error(
      `haqumei-api analyze returned ${data.items.length} items for ${texts.length} texts`,
    );
  }

  return data.items.map((item) => analyzeItemSchema.parse(item));
}

export async function analyzeTexts(serverEnv: ServerEnv, texts: string[]): Promise<AnalyzeItem[]> {
  if (texts.length === 0) {
    return [];
  }

  for (const text of texts) {
    assertHaqumeiTextLength(text);
  }

  const items: AnalyzeItem[] = [];
  let chunkOffset = 0;
  for (const chunk of chunkAnalyzeTexts(texts)) {
    try {
      items.push(...(await requestAnalyze(serverEnv, chunk)));
    } catch (error) {
      if (error instanceof HaqumeiApiError) {
        throw error.withChunkOffset(chunkOffset);
      }

      throw error;
    }

    chunkOffset += chunk.length;
  }

  return items;
}

export async function analyzeText(serverEnv: ServerEnv, text: string): Promise<AnalyzeItem> {
  const [item] = await analyzeTexts(serverEnv, [text]);
  if (!item) {
    throw new Error("haqumei-api analyze returned no items");
  }

  return item;
}

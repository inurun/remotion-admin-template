import { g2pItemSchema, type G2pItem } from "@/_schemas";
import type { ServerEnv } from "@/server/core/env";
import { getHaqumeiApiClient, unwrapHaqumeiData } from "./client";
import { assertHaqumeiTextLength, chunkAnalyzeTexts } from "./limits";

async function requestAnalyze(serverEnv: ServerEnv, texts: string[]): Promise<G2pItem[]> {
  const response = await getHaqumeiApiClient(serverEnv).POST("/v1/analyze", {
    body: { texts },
  });
  const data = unwrapHaqumeiData(response);
  if (data.items.length !== texts.length) {
    throw new Error(
      `haqumei-api analyze returned ${data.items.length} items for ${texts.length} texts`,
    );
  }

  return data.items.map((item) => g2pItemSchema.parse(item));
}

export async function analyzeTexts(serverEnv: ServerEnv, texts: string[]): Promise<G2pItem[]> {
  if (texts.length === 0) {
    return [];
  }

  for (const text of texts) {
    assertHaqumeiTextLength(text);
  }

  const items: G2pItem[] = [];
  for (const chunk of chunkAnalyzeTexts(texts)) {
    items.push(...(await requestAnalyze(serverEnv, chunk)));
  }

  return items;
}

export async function analyzeText(serverEnv: ServerEnv, text: string): Promise<G2pItem> {
  const [item] = await analyzeTexts(serverEnv, [text]);
  if (!item) {
    throw new Error("haqumei-api analyze returned no items");
  }

  return item;
}

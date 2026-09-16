import type { OutroBlock } from "@/_schemas";

export const OUTRO_BLOCK_URL_PLACEHOLDER = "https://example.com";

export function createBlankOutroBlock(partial?: Partial<OutroBlock>): OutroBlock {
  return {
    id: crypto.randomUUID(),
    url: "",
    title: "",
    description: "",
    image: null,
    logo: null,
    favicon: null,
    author: "",
    date: "",
    publisher: "",
    lang: "",
    audio: null,
    video: null,
    iframe: "",
    feed: "",
    impression: "",
    ...partial,
  };
}

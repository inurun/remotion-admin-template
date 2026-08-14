import { pageHeadingHandler } from "@/app/features/zen/handlers/page-heading";
import { speakerHandler } from "@/app/features/zen/handlers/speaker";
import { speechHandler } from "@/app/features/zen/handlers/speech";
import { tagsHandler } from "@/app/features/zen/handlers/tags";
import type { ZenLineHandler } from "@/app/features/zen/types";

const defaultHandlers: ZenLineHandler[] = [
  pageHeadingHandler,
  tagsHandler,
  speakerHandler,
  speechHandler,
];

export function createZenLineHandlers(extra: ZenLineHandler[] = []): ZenLineHandler[] {
  return [...defaultHandlers, ...extra].sort((a, b) => b.priority - a.priority);
}

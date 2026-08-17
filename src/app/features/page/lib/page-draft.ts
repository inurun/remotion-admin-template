import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import type { PageType } from "@/_schemas";

export function createBlankPageInput({
  id,
  title,
  type,
}: {
  id: string;
  title: string;
  type: PageType;
}): PageFormValues {
  if (type === "outro") {
    return {
      id,
      title,
      type,
      meta: { tags: [], blocks: [] },
      padBeforeSec: 0,
      padAfterSec: 0,
      richText: null,
      tts: [],
    };
  }

  if (type === "endcard") {
    return {
      id,
      title,
      type,
      meta: {
        tags: [],
        nicoadSource: "",
        credits: [],
        advertisers: [],
        messages: [],
      },
      padBeforeSec: 0,
      padAfterSec: 0,
      richText: null,
      tts: [],
    };
  }

  return {
    id,
    title,
    type,
    meta: { tags: [] },
    padBeforeSec: 0,
    padAfterSec: 0,
    richText: null,
    tts: [],
  };
}

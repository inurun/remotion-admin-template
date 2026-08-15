import type { EndcardAdvertiser, EndcardCredit, EndcardMessage } from "@/_schemas";
import { createUuid } from "@/_shared/lib/utils";

export function createBlankEndcardCredit(partial?: Partial<EndcardCredit>): EndcardCredit {
  return {
    id: createUuid(),
    title: "",
    url: "",
    ...partial,
  };
}

export function createBlankEndcardAdvertiser(
  partial?: Partial<EndcardAdvertiser>,
): EndcardAdvertiser {
  return {
    id: createUuid(),
    name: "",
    message: "",
    ...partial,
  };
}

export function createBlankEndcardMessage(partial?: Partial<EndcardMessage>): EndcardMessage {
  return {
    id: createUuid(),
    text: "",
    ...partial,
  };
}

import type { EndcardAdvertiser, EndcardCredit, EndcardMessage } from "@/_schemas";

export function createBlankEndcardCredit(partial?: Partial<EndcardCredit>): EndcardCredit {
  return {
    id: crypto.randomUUID(),
    title: "",
    url: "",
    ...partial,
  };
}

export function createBlankEndcardAdvertiser(
  partial?: Partial<EndcardAdvertiser>,
): EndcardAdvertiser {
  return {
    id: crypto.randomUUID(),
    identityKey: `manual:${crypto.randomUUID()}`,
    introductionCount: 0,
    name: "",
    message: "",
    ...partial,
  };
}

export function createBlankEndcardMessage(partial?: Partial<EndcardMessage>): EndcardMessage {
  return {
    id: crypto.randomUUID(),
    text: "",
    ...partial,
  };
}

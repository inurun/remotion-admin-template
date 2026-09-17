import { getVoiceId, toVoiceIdentity } from "@/_schemas";

export function getVoiceValue(item: Parameters<typeof toVoiceIdentity>[0]) {
  const identity = toVoiceIdentity(item);
  return identity ? getVoiceId(identity) : "";
}

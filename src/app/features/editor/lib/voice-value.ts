export function getVoiceValue(item: {
  provider: string;
  voiceName: string;
  voiceVersion?: string;
}) {
  return `${item.provider}::${item.voiceName}::${item.voiceVersion ?? ""}`;
}

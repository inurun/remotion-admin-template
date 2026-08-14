import { type VoiceOption, voiceOptionSchema } from "@/_schemas";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function toDisplayName(voiceName: string, voiceVersion?: string) {
  const base = voiceName.replace(/_ja_JP$/u, "").replaceAll("-", " ");
  return voiceVersion ? `${base} v${voiceVersion}` : base;
}

function getRecordString(record: Record<string, JsonValue>, ...keys: string[]) {
  for (const key of keys) {
    if (typeof record[key] === "string") {
      return record[key] as string;
    }
  }

  return undefined;
}

function toVoiceOption(record: Record<string, JsonValue>) {
  const voiceName = getRecordString(record, "voice_name", "voiceName");
  if (!voiceName) {
    return null;
  }

  const voiceVersion = getRecordString(record, "voice_version", "voiceVersion");
  const displayName = getRecordString(record, "display_name", "displayName");
  return voiceOptionSchema.parse({
    provider: "voisona",
    voiceName,
    ...(voiceVersion ? { voiceVersion } : {}),
    displayName: displayName ?? toDisplayName(voiceName, voiceVersion),
  });
}

function collectFromArray(value: JsonValue[], output: VoiceOption[]) {
  for (const entry of value) {
    collectVoiceOptions(entry, output);
  }
}

function collectFromRecord(record: Record<string, JsonValue>, output: VoiceOption[]) {
  const option = toVoiceOption(record);
  if (option) {
    output.push(option);
  }

  for (const nested of Object.values(record)) {
    collectVoiceOptions(nested, output);
  }
}

export function collectVoiceOptions(value: JsonValue, output: VoiceOption[]) {
  if (Array.isArray(value)) {
    collectFromArray(value, output);
    return;
  }

  if (value && typeof value === "object") {
    collectFromRecord(value as Record<string, JsonValue>, output);
  }
}

export function dedupeVoiceOptions(options: VoiceOption[]) {
  return Array.from(
    new Map(
      options.map((option) => [
        `${option.provider}:${option.voiceName}:${option.voiceVersion ?? ""}`,
        option,
      ]),
    ).values(),
  ).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

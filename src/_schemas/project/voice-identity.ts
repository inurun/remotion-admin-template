export type NamedVoiceProvider = "voisona" | "voicevox" | "voicepeak";

export type NamedVoiceIdentity = {
  provider: NamedVoiceProvider;
  voiceName: string;
  voiceVersion?: string;
};

export type CoeiroinkVoiceIdentity = {
  provider: "coeiroink";
  speakerUuid: string;
  styleId: number;
  modelVersion: string;
};

export type VoiceIdentity = NamedVoiceIdentity | CoeiroinkVoiceIdentity;

export function getVoiceId(voice: VoiceIdentity): string {
  if (voice.provider === "coeiroink") {
    return `coeiroink::${voice.speakerUuid}::${voice.styleId}::${voice.modelVersion}`;
  }

  return `${voice.provider}::${voice.voiceName}::${voice.voiceVersion ?? ""}`;
}

export function getVoiceMatchKey(voice: VoiceIdentity): string {
  if (voice.provider === "coeiroink") {
    return `coeiroink::${voice.speakerUuid}::${voice.styleId}`;
  }

  return `${voice.provider}::${voice.voiceName}`;
}

export function parseVoiceId(voiceId: string): VoiceIdentity | null {
  const parts = voiceId.split("::");
  const provider = parts[0];
  if (provider === "coeiroink") {
    const speakerUuid = parts[1];
    const styleText = parts[2];
    if (!speakerUuid || styleText === undefined || styleText === "") {
      return null;
    }
    const styleId = Number(styleText);
    if (!Number.isInteger(styleId)) {
      return null;
    }
    return {
      provider: "coeiroink",
      speakerUuid,
      styleId,
      modelVersion: parts.slice(3).join("::"),
    };
  }

  if (provider !== "voisona" && provider !== "voicevox" && provider !== "voicepeak") {
    return null;
  }

  const voiceName = parts[1];
  if (!voiceName) {
    return null;
  }

  return {
    provider,
    voiceName,
    voiceVersion: parts.slice(2).join("::"),
  };
}

export function copyVoiceIdentity(voice: VoiceIdentity): VoiceIdentity {
  if (voice.provider === "coeiroink") {
    return {
      provider: "coeiroink",
      speakerUuid: voice.speakerUuid,
      styleId: voice.styleId,
      modelVersion: voice.modelVersion,
    };
  }

  return {
    provider: voice.provider,
    voiceName: voice.voiceName,
    ...(voice.voiceVersion ? { voiceVersion: voice.voiceVersion } : {}),
  };
}

export function voiceIdentitiesEqual(left: VoiceIdentity, right: VoiceIdentity) {
  return getVoiceId(left) === getVoiceId(right);
}

export function hasVoiceIdentity(voice: {
  provider: string;
  voiceName?: string;
  speakerUuid?: string;
  styleId?: number;
  modelVersion?: string;
}) {
  if (voice.provider === "coeiroink") {
    return (
      Boolean(voice.speakerUuid?.trim()) &&
      typeof voice.styleId === "number" &&
      Number.isInteger(voice.styleId) &&
      Boolean(voice.modelVersion?.trim())
    );
  }

  return Boolean(voice.voiceName?.trim());
}

export function toVoiceIdentity(voice: {
  provider: string;
  voiceName?: string;
  voiceVersion?: string;
  speakerUuid?: string;
  styleId?: number;
  modelVersion?: string;
}): VoiceIdentity | null {
  if (voice.provider === "coeiroink") {
    if (
      !hasVoiceIdentity(voice) ||
      voice.speakerUuid === undefined ||
      voice.styleId === undefined
    ) {
      return null;
    }
    return {
      provider: "coeiroink",
      speakerUuid: voice.speakerUuid,
      styleId: voice.styleId,
      modelVersion: voice.modelVersion ?? "",
    };
  }

  if (
    voice.provider !== "voisona" &&
    voice.provider !== "voicevox" &&
    voice.provider !== "voicepeak"
  ) {
    return null;
  }

  return {
    provider: voice.provider,
    voiceName: voice.voiceName ?? "",
    ...(voice.voiceVersion ? { voiceVersion: voice.voiceVersion } : {}),
  };
}

export function ttsVoiceId(item: Parameters<typeof toVoiceIdentity>[0]) {
  const identity = toVoiceIdentity(item);
  return identity ? getVoiceId(identity) : "";
}

export const voicePresetId = getVoiceId;

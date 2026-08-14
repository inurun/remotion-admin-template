export type VoicevoxMora = {
  text: string;
  consonant?: string | null;
  consonant_length?: number | null;
  vowel: string;
  vowel_length: number;
  pitch: number;
};

export type VoicevoxAccentPhrase = {
  moras: VoicevoxMora[];
  accent: number;
  pause_mora?: VoicevoxMora | null;
  is_interrogative?: boolean;
};

export type VoicevoxAudioQuery = {
  accent_phrases: VoicevoxAccentPhrase[];
  [key: string]: unknown;
};

function assertAudioQuery(value: unknown): asserts value is VoicevoxAudioQuery {
  if (!isRecord(value)) {
    throw new Error("VOICEVOX analysis must be an object");
  }

  if (!Array.isArray(value.accent_phrases)) {
    throw new Error("VOICEVOX accent_phrases is missing");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseVoicevoxAnalysis(value: string): VoicevoxAudioQuery {
  const parsed = JSON.parse(value) as unknown;
  assertAudioQuery(parsed);
  return parsed;
}

export function serializeVoicevoxAnalysis(query: VoicevoxAudioQuery) {
  return JSON.stringify(query);
}

export function cloneVoicevoxAudioQuery(query: VoicevoxAudioQuery): VoicevoxAudioQuery {
  return {
    ...query,
    accent_phrases: query.accent_phrases.map((phrase) => ({
      ...phrase,
      moras: phrase.moras.map((mora) => ({ ...mora })),
      ...(phrase.pause_mora ? { pause_mora: { ...phrase.pause_mora } } : {}),
    })),
  };
}

export function setVoicevoxAccent(
  query: VoicevoxAudioQuery,
  phraseIndex: number,
  moraIndex: number,
) {
  const phrase = query.accent_phrases[phraseIndex];
  if (!phrase) {
    return;
  }

  phrase.accent = moraIndex + 1;
}

export function mergeVoicevoxPhrases(query: VoicevoxAudioQuery, phraseIndex: number) {
  const left = query.accent_phrases[phraseIndex];
  const right = query.accent_phrases[phraseIndex + 1];
  if (!left || !right) {
    return null;
  }

  const leftLength = left.moras.length;
  query.accent_phrases.splice(phraseIndex, 2, createMergedPhrase(left, right));

  return leftLength;
}

function createMergedPhrase(left: VoicevoxAccentPhrase, right: VoicevoxAccentPhrase) {
  return {
    ...left,
    moras: [...left.moras, ...right.moras],
    pause_mora: right.pause_mora ?? left.pause_mora,
    is_interrogative: right.is_interrogative ?? left.is_interrogative,
  };
}

export function splitVoicevoxPhrase(
  query: VoicevoxAudioQuery,
  phraseIndex: number,
  moraOffset: number,
) {
  const phrase = query.accent_phrases[phraseIndex];
  if (!phrase || moraOffset <= 0 || moraOffset >= phrase.moras.length) {
    return;
  }

  const leftMoras = phrase.moras.slice(0, moraOffset);
  const rightMoras = phrase.moras.slice(moraOffset);
  query.accent_phrases.splice(
    phraseIndex,
    1,
    {
      ...phrase,
      moras: leftMoras,
      accent: Math.min(phrase.accent, leftMoras.length),
      pause_mora: undefined,
      is_interrogative: false,
    },
    {
      ...phrase,
      moras: rightMoras,
      accent: Math.max(1, phrase.accent - leftMoras.length),
    },
  );
}

export function getVoicevoxPhraseKey(phrase: VoicevoxAccentPhrase) {
  return phrase.moras.map((mora) => mora.text).join("");
}

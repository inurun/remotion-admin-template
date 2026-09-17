const DEFAULT_VOICEVOX_TIMING = {
  prePhonemeLength: 0,
  postPhonemeLength: 0,
  pauseLengthScale: 0.5,
} as const;

export const KASANE_TETO_NARRATOR = "Kasane Teto";

export const DEFAULT_KASANE_TETO_EMOTION = {
  "teto-overactive": 10,
  "teto-low-key": 20,
  "teto-whisper": 20,
  "teto-powerful": 10,
  "teto-sweet": 30,
} as const;

export const DEFAULT_VOICEPEAK_SPEED = 90;
export const DEFAULT_VOICEPEAK_PITCH = 0;

export const DEFAULT_VOICE_PRESETS = {
  "voicevox::3::": {
    provider: "voicevox" as const,
    voiceName: "3",
    synthesisSettings: {
      speedScale: 1.4,
      pitchScale: -0.01,
      intonationScale: 0.9,
      ...DEFAULT_VOICEVOX_TIMING,
    },
  },
  "voicevox::14::": {
    provider: "voicevox" as const,
    voiceName: "14",
    synthesisSettings: {
      speedScale: 1.3,
      intonationScale: 1,
      pitchScale: -0.02,
      ...DEFAULT_VOICEVOX_TIMING,
    },
  },
  "voicevox::46::": {
    provider: "voicevox" as const,
    voiceName: "46",
    synthesisSettings: {
      speedScale: 1.3,
      pitchScale: -0.02,
      ...DEFAULT_VOICEVOX_TIMING,
    },
  },
  "voicevox::43::": {
    provider: "voicevox" as const,
    voiceName: "43",
    synthesisSettings: {
      speedScale: 1.3,
      intonationScale: 1.2,
      ...DEFAULT_VOICEVOX_TIMING,
    },
  },
  "voicevox::113::": {
    provider: "voicevox" as const,
    voiceName: "113",
    synthesisSettings: {
      speedScale: 1.3,
      pitchScale: 0.01,
      intonationScale: 0.95,
      ...DEFAULT_VOICEVOX_TIMING,
    },
  },
  "voicepeak::Kasane Teto::": {
    provider: "voicepeak" as const,
    voiceName: KASANE_TETO_NARRATOR,
    synthesisSettings: {
      speed: DEFAULT_VOICEPEAK_SPEED,
      pitch: DEFAULT_VOICEPEAK_PITCH,
      emotion: { ...DEFAULT_KASANE_TETO_EMOTION },
    },
  },
  "voisona::futaba-minato_ja_JP::2.0.2": {
    provider: "voisona" as const,
    voiceName: "futaba-minato_ja_JP",
    voiceVersion: "2.0.2",
    synthesisSettings: {
      speed: 1.4,
      huskiness: 0.7,
      style_weights: [0, 1, 0, 0.2, 0, 1],
    },
  },
  "voisona::ui_ja_JP::2.0.0": {
    provider: "voisona" as const,
    voiceName: "ui_ja_JP",
    voiceVersion: "2.0.0",
    synthesisSettings: {
      alp: 0.1,
      speed: 1.3,
      huskiness: 0.8,
      style_weights: [0.33, 0, 0, 0.33, 0.33],
    },
  },
  "coeiroink::272c0178-a248-11f1-82fa-0242ac1c000c::1295160681::0.0.1": {
    provider: "coeiroink",
    speakerUuid: "272c0178-a248-11f1-82fa-0242ac1c000c",
    styleId: 1295160681,
    modelVersion: "0.0.1",
    synthesisSettings: {
      speedScale: 1.2,
      prePhonemeLength: 0,
      postPhonemeLength: 0,
    },
  },
};

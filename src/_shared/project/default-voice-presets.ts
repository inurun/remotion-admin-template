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

const DEFAULT_VOICEVOX_TIMING = {
  prePhonemeLength: 0,
  postPhonemeLength: 0,
  pauseLengthScale: 0.5,
} as const;

const DEFAULT_VOICE_PRESETS = [
  {
    provider: "voicevox" as const,
    voiceName: "3",
    synthesisSettings: {
      speedScale: 1.4,
      pitchScale: -0.01,
      intonationScale: 0.9,
      ...DEFAULT_VOICEVOX_TIMING,
    },
  },
  {
    provider: "voicevox" as const,
    voiceName: "14",
    synthesisSettings: {
      speedScale: 1.3,
      intonationScale: 1,
      pitchScale: -0.02,
      ...DEFAULT_VOICEVOX_TIMING,
    },
  },
  {
    provider: "voicevox" as const,
    voiceName: "46",
    synthesisSettings: {
      speedScale: 1.3,
      pitchScale: -0.02,
      ...DEFAULT_VOICEVOX_TIMING,
    },
  },
  {
    provider: "voicevox" as const,
    voiceName: "43",
    synthesisSettings: {
      speedScale: 1.3,
      intonationScale: 1.2,
      ...DEFAULT_VOICEVOX_TIMING,
    },
  },
  {
    provider: "voicevox" as const,
    voiceName: "113",
    synthesisSettings: {
      speedScale: 1.3,
      pitchScale: 0.01,
      intonationScale: 0.95,
      ...DEFAULT_VOICEVOX_TIMING,
    },
  },
  {
    provider: "voicepeak" as const,
    voiceName: KASANE_TETO_NARRATOR,
    synthesisSettings: {
      speed: DEFAULT_VOICEPEAK_SPEED,
      pitch: DEFAULT_VOICEPEAK_PITCH,
      emotion: { ...DEFAULT_KASANE_TETO_EMOTION },
    },
  },
  {
    provider: "voisona" as const,
    voiceName: "futaba-minato_ja_JP",
    voiceVersion: "2.0.2",
    synthesisSettings: {
      speed: 1.4,
      huskiness: 0.7,
      style_weights: [0, 1, 0, 0.2, 0, 1],
    },
  },
];

export function getDefaultVoicePresets() {
  return structuredClone(DEFAULT_VOICE_PRESETS);
}

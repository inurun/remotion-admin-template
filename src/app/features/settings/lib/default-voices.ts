import type { VoiceOption } from "@/_schemas";
import { getVoiceId } from "@/app/features/settings/lib/voice-id";

export type DefaultVoiceDefinition = {
  voice: VoiceOption;
  label: string;
  alias: string;
  hotkey: string;
};

export const DEFAULT_VOICE_DEFINITIONS: DefaultVoiceDefinition[] = [
  {
    voice: {
      provider: "voicevox",
      voiceName: "3",
      displayName: "ずんだもん / ノーマル",
    },
    label: "🫛 ずんだ",
    alias: "zunda",
    hotkey: "ctrl+1",
  },
  {
    voice: {
      provider: "voicevox",
      voiceName: "14",
      displayName: "冥鳴ひまり / ノーマル",
    },
    label: "🔮 ひまり",
    alias: "himari",
    hotkey: "ctrl+2",
  },
  {
    voice: {
      provider: "voicevox",
      voiceName: "46",
      displayName: "小夜/SAYO / ノーマル",
    },
    label: "🐾 さよ",
    alias: "sayo",
    hotkey: "ctrl+3",
  },
  {
    voice: {
      provider: "voicevox",
      voiceName: "43",
      displayName: "櫻歌ミコ / ノーマル",
    },
    label: "🌸 ミコ",
    alias: "miko",
    hotkey: "ctrl+4",
  },
  {
    voice: {
      provider: "voicevox",
      voiceName: "113",
      displayName: "あんこもん / ノーマル",
    },
    label: "🍡 あんこ",
    alias: "anko",
    hotkey: "ctrl+5",
  },
  {
    voice: {
      provider: "voicepeak",
      voiceName: "Kasane Teto",
      displayName: "Kasane Teto",
    },
    label: "🎧 テト",
    alias: "teto",
    hotkey: "ctrl+6",
  },
  {
    voice: {
      provider: "voisona",
      voiceName: "futaba-minato_ja_JP",
      voiceVersion: "2.0.2",
      displayName: "futaba minato v2.0.2",
    },
    label: "🌱 ふたば",
    alias: "futaba",
    hotkey: "ctrl+7",
  },
];

export function getDefaultVoiceOptions(): VoiceOption[] {
  return DEFAULT_VOICE_DEFINITIONS.map((item) => ({ ...item.voice }));
}

export function getDefaultVoiceOrder(): string[] {
  return DEFAULT_VOICE_DEFINITIONS.map((item) => getVoiceId(item.voice));
}

export function getDefaultVoiceSettings(): Record<
  string,
  { label: string; alias: string; hotkey: string }
> {
  return Object.fromEntries(
    DEFAULT_VOICE_DEFINITIONS.map((item) => [
      getVoiceId(item.voice),
      {
        label: item.label,
        alias: item.alias,
        hotkey: item.hotkey,
      },
    ]),
  );
}

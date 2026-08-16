import type { DraftTts, G2pItem, SavedTts } from "@/_schemas";
import type { ServerEnv } from "@/server/core/env";
import type { SynthesizeResponse } from "@/server/features/tts/contract";

export type TtsProvider = DraftTts["provider"];
export type DraftTtsForProvider<TProvider extends TtsProvider> = Extract<
  DraftTts,
  { provider: TProvider }
>;
export type SavedTtsForProvider<TProvider extends TtsProvider> = Extract<
  SavedTts,
  { provider: TProvider }
>;

export type TtsComparisonInput<TProvider extends TtsProvider> = {
  provider: TProvider;
  text: string;
  readText: string;
  voiceName: string;
  voiceVersion: string;
  g2p?: G2pItem;
  synthesisSettings?: NonNullable<DraftTtsForProvider<TProvider>["synthesisSettings"]>;
};

export type TtsSynthesisInput<TProvider extends TtsProvider> = TtsComparisonInput<TProvider> & {
  projectPath: string;
  voiceVersion?: string;
};

export type TtsProviderAdapter<TProvider extends TtsProvider> = {
  provider: TProvider;
  usesG2p: boolean;
  createComparisonInput: (item: DraftTtsForProvider<TProvider>) => TtsComparisonInput<TProvider>;
  createPreviousComparisonInput: (
    item: SavedTtsForProvider<TProvider>,
  ) => TtsComparisonInput<TProvider>;
  synthesize: (
    serverEnv: ServerEnv,
    input: TtsSynthesisInput<TProvider>,
  ) => Promise<SynthesizeResponse>;
};

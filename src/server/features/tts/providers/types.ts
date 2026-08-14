import type { DraftTts, SavedTts } from "@/_schemas";
import type { ServerEnv } from "@/server/core/env";
import type { SynthesizeResponse } from "@/server/features/voisona/contract";

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
  analysis: string;
  synthesisSettings?: NonNullable<DraftTtsForProvider<TProvider>["synthesisSettings"]>;
};

export type TtsSynthesisInput<TProvider extends TtsProvider> = TtsComparisonInput<TProvider> & {
  analysis: string;
  voiceVersion?: string;
  projectPath: string;
};

export type TtsProviderAdapter<TProvider extends TtsProvider> = {
  provider: TProvider;
  createComparisonInput: (item: DraftTtsForProvider<TProvider>) => TtsComparisonInput<TProvider>;
  createPreviousComparisonInput: (
    item: SavedTtsForProvider<TProvider>,
  ) => TtsComparisonInput<TProvider>;
  analyze: (serverEnv: ServerEnv, input: TtsComparisonInput<TProvider>) => Promise<string>;
  synthesize: (
    serverEnv: ServerEnv,
    input: TtsSynthesisInput<TProvider>,
  ) => Promise<SynthesizeResponse>;
};

import type { DraftTts, SavedTts } from "@/_schemas";
import type { TtsProvider, TtsProviderAdapter } from "./types";
import { voisonaProvider } from "./voisona-provider";
import { voicepeakProvider } from "./voicepeak-provider";
import { voicevoxProvider } from "./voicevox-provider";

const providers = {
  voisona: voisonaProvider,
  voicevox: voicevoxProvider,
  voicepeak: voicepeakProvider,
} satisfies { [TProvider in TtsProvider]: TtsProviderAdapter<TProvider> };

export function getTtsProvider<TProvider extends TtsProvider>(provider: TProvider) {
  return providers[provider];
}

export function createTtsComparisonInput(item: DraftTts) {
  return getTtsProvider(item.provider).createComparisonInput(item as never);
}

export function createPreviousTtsComparisonInput(item: SavedTts) {
  return getTtsProvider(item.provider).createPreviousComparisonInput(item as never);
}

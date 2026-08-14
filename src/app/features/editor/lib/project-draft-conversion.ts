import type { DraftTts, SavedTts } from "@/_schemas";

export function toDraftTts(item: SavedTts): DraftTts {
  return {
    id: item.id,
    provider: item.provider,
    text: item.text,
    readText: item.readText,
    voiceName: item.voiceName,
    padBeforeSec: item.padBeforeSec,
    padAfterSec: item.padAfterSec,
    volume: item.volume,
    ...(item.voiceVersion ? { voiceVersion: item.voiceVersion } : {}),
    ...(item.synthesisSettings ? { synthesisSettings: item.synthesisSettings } : {}),
    ...(item.avatar ? { avatar: item.avatar } : {}),
    speech: {
      analysis: item.speech.analysis,
    },
  } as DraftTts;
}

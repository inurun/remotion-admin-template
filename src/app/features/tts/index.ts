export { TtsContextProvider, useTts } from "@/app/features/tts/context/tts-context";
export {
  SelectedTtsContextProvider,
  useSelectedTts,
} from "@/app/features/tts/context/selected-tts-context";
export {
  TtsTextFocusContextProvider,
  useTtsTextFocus,
  useTtsTextFocusRef,
} from "@/app/features/tts/context/tts-text-focus-context";
export { createDraftTts } from "@/app/features/tts/lib/create-draft-tts";
export { applyTtsTextChange } from "@/app/features/tts/lib/apply-tts-text-change";
export { applyTtsVoiceChange } from "@/app/features/tts/lib/apply-tts-voice-change";
export {
  getTtsMoveState,
  resolveTtsIndexAfterInsert,
  resolveTtsIndexAfterRemove,
} from "@/app/features/tts/lib/tts-selection";

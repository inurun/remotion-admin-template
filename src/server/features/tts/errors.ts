export class TtsCacheClearConflictError extends Error {
  readonly code = "tts_pending";

  constructor() {
    super("TTS synthesis is still pending");
    this.name = "TtsCacheClearConflictError";
  }
}

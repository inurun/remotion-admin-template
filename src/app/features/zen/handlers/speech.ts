import type { ZenLineHandler } from "@/app/features/zen/types";

/** Half-width double space becomes an in-TTS newline. */
export function normalizeSpeechText(line: string) {
  return line.replaceAll("  ", "\n");
}

export const speechHandler: ZenLineHandler = {
  id: "speech",
  priority: 0,
  match: (line) => line.length > 0,
  apply: ({ line, lineNumber, state }) => {
    if (!state.currentPage) {
      state.errors.push({ line: lineNumber, message: "Speech requires a page heading first." });
      return;
    }

    if (!state.currentSpeaker) {
      state.errors.push({ line: lineNumber, message: "Speech requires a @speaker first." });
      return;
    }

    state.currentSpeaker.lines.push(normalizeSpeechText(line));
  },
};

import type { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import type { VoiceOption } from "@/_schemas";
import { getTtsComposeCommandOptions } from "@/app/features/tts/lib/tts-compose-command";

export function createTtsComposeCompletionSource(voice: VoiceOption | undefined) {
  return (context: CompletionContext): CompletionResult | null => {
    if (!voice) return null;
    const before = context.state.doc.sliceString(0, context.pos);
    const tokens = before.split(/\s+/);
    const prefix = tokens.pop() ?? "";
    if (
      !prefix.startsWith("/") ||
      tokens.some((token) => token && !/^\/[a-z]+\.[^\s]+$/.test(token))
    ) {
      return null;
    }
    const used = new Set(tokens.map((token) => token.slice(1, 2)));
    const options = getTtsComposeCommandOptions(voice, used)
      .filter((label) => label.startsWith(prefix))
      .map((label) => ({ label, apply: `${label} `, type: "property" }));
    return options.length > 0 ? { from: context.pos - prefix.length, options } : null;
  };
}

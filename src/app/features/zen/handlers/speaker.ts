import { ensureZenPage } from "@/app/features/zen/handlers/page-state";
import { normalizeEyesToken } from "@/app/features/zen/normalize-eyes";
import type { ZenLineHandler } from "@/app/features/zen/types";

export const speakerHandler: ZenLineHandler = {
  id: "speaker",
  priority: 80,
  match: (line) => /^@\S/.test(line),
  apply: ({ line, lineNumber, state }) => {
    const page = ensureZenPage(state, lineNumber);
    const tokens = line.trim().split(/\s+/);
    const alias = tokens[0]?.slice(1) ?? "";
    const eyesToken = tokens[1];

    if (!alias) {
      state.errors.push({ line: lineNumber, message: "Speaker alias is required." });
      return;
    }

    const target = state.aliases.get(alias);
    if (!target) {
      state.errors.push({ line: lineNumber, message: `Unknown alias "@${alias}".` });
      return;
    }

    let eyes: string | undefined;
    if (eyesToken) {
      const normalized = normalizeEyesToken(eyesToken, target.avatarType);
      if (!normalized) {
        state.errors.push({
          line: lineNumber,
          message: `Unknown eyes "${eyesToken}" for @${alias}.`,
        });
        return;
      }
      eyes = normalized;
    }

    if (tokens.length > 2) {
      state.errors.push({
        line: lineNumber,
        message: `Unexpected tokens after @${alias}.`,
      });
      return;
    }

    const speaker = {
      alias,
      eyes,
      lines: [],
      lineNumber,
    };
    page.speakers.push(speaker);
    state.currentSpeaker = speaker;
  },
};

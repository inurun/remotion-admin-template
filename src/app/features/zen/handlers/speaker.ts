import { ensureZenPage } from "@/app/features/zen/handlers/page-state";
import { parseAvatarTokens } from "@/app/features/zen/avatar-tokens";
import type { ZenLineHandler } from "@/app/features/zen/types";

export const speakerHandler: ZenLineHandler = {
  id: "speaker",
  priority: 80,
  match: (line) => /^@\S/.test(line),
  apply: ({ line, lineNumber, state }) => {
    const page = ensureZenPage(state, lineNumber);
    const tokens = line.trim().split(/\s+/);
    const alias = tokens[0]?.slice(1) ?? "";

    if (!alias) {
      state.errors.push({ line: lineNumber, message: "Speaker alias is required." });
      return;
    }

    const target = state.aliases.get(alias);
    if (!target) {
      state.errors.push({ line: lineNumber, message: `Unknown alias "@${alias}".` });
      return;
    }

    let avatar;
    try {
      avatar = parseAvatarTokens(tokens.slice(1), target.avatarType);
    } catch (error) {
      state.errors.push({ line: lineNumber, message: (error as Error).message });
      return;
    }

    const speaker = {
      alias,
      avatar,
      lines: [],
      lineNumber,
    };
    page.speakers.push(speaker);
    state.currentSpeaker = speaker;
  },
};

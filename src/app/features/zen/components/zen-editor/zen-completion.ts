import { type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import type { AvatarType } from "@/_schemas";
import { avatarTokenFields, getZenAvatarOptions } from "@/app/features/zen/avatar-tokens";

export type ZenCompletionAlias = {
  alias: string;
  avatarType: AvatarType;
};

export function createZenCompletionSource(aliases: ZenCompletionAlias[]) {
  const aliasLabels = aliases.map((item) => item.alias);
  const optionsByAlias = new Map(
    aliases.map(({ alias, avatarType }) => {
      const options = getZenAvatarOptions(avatarType);
      return [
        alias,
        Object.entries(avatarTokenFields).flatMap(([key, field]) =>
          options[field].map((value) => `${key}.${value}`),
        ),
      ];
    }),
  );

  return (context: CompletionContext): CompletionResult | null => {
    const line = context.state.doc.lineAt(context.pos);
    const textBefore = line.text.slice(0, context.pos - line.from);

    const speakerMatch = textBefore.match(/^@(\S+)\s+(.*)$/);
    if (speakerMatch) {
      const options = optionsByAlias.get(speakerMatch[1]);
      if (!options) return null;
      const tokens = speakerMatch[2].split(/\s+/);
      const prefix = tokens.pop() ?? "";
      const used = new Set(tokens.map((token) => token.split(".")[0]));
      return {
        from: context.pos - prefix.length,
        options: options
          .filter((token) => !used.has(token.split(".")[0]) && token.startsWith(prefix))
          .map((label) => ({ label, type: "property" })),
      };
    }

    const atMatch = textBefore.match(/(?:^|\s)@(\S*)$/);
    if (atMatch) {
      const prefix = atMatch[1] ?? "";
      return {
        from: context.pos - prefix.length,
        options: aliasLabels
          .filter((alias) => alias.startsWith(prefix))
          .map((alias) => ({
            label: alias,
            type: "keyword",
          })),
      };
    }

    return null;
  };
}

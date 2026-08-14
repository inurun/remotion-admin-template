import { type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import type { AvatarType } from "@/_schemas";
import { getEyesOptions } from "@/app/features/zen";

export type ZenCompletionAlias = {
  alias: string;
  avatarType: AvatarType;
};

export function createZenCompletionSource(aliases: ZenCompletionAlias[]) {
  const aliasLabels = aliases.map((item) => item.alias);
  const eyesByAlias = new Map(
    aliases.map((item) => [item.alias, [...getEyesOptions(item.avatarType)]]),
  );

  return (context: CompletionContext): CompletionResult | null => {
    const line = context.state.doc.lineAt(context.pos);
    const textBefore = line.text.slice(0, context.pos - line.from);

    const speakerMatch = textBefore.match(/^@(\S+)\s+(\S*)$/);
    if (speakerMatch) {
      const alias = speakerMatch[1];
      const eyesPrefix = speakerMatch[2] ?? "";
      const eyes = eyesByAlias.get(alias);
      if (!eyes) {
        return null;
      }

      return {
        from: context.pos - eyesPrefix.length,
        options: eyes
          .filter((eye) => eye.startsWith(eyesPrefix))
          .map((eye) => ({
            label: eye,
            type: "property",
          })),
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

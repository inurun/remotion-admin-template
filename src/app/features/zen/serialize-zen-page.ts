import type { DraftPage, DraftTts } from "@/_schemas";
import { getAvatarTypeByVoiceName } from "@/_shared/lib/avatar/avatar-settings";
import { getVoiceId } from "@/app/features/settings";
import { createVoiceAliasMap } from "@/app/features/zen/create-alias-map";
import { getDefaultEyes } from "@/app/features/zen/normalize-eyes";
import type { ZenAliasTarget, ZenSpeakerBlock } from "@/app/features/zen/types";

function serializeSpeechText(text: string) {
  return text.replaceAll("\n", "  ");
}

function resolveAlias(item: DraftTts, voiceAliases: Map<string, string>) {
  const voiceId = getVoiceId({
    provider: item.provider,
    voiceName: item.voiceName ?? "",
    voiceVersion: item.voiceVersion,
  });
  return voiceAliases.get(voiceId) ?? item.voiceName ?? "unknown";
}

function resolveEyesToken(item: DraftTts) {
  const eyes = item.avatar?.eyes;
  if (!eyes) {
    return undefined;
  }

  const defaultEyes = getDefaultEyes(getAvatarTypeByVoiceName(item.voiceName));
  return eyes === defaultEyes ? undefined : eyes;
}

function toSpeakerBlocks(tts: DraftTts[], voiceAliases: Map<string, string>): ZenSpeakerBlock[] {
  const speakers: ZenSpeakerBlock[] = [];

  for (const item of tts) {
    const alias = resolveAlias(item, voiceAliases);
    const eyes = resolveEyesToken(item);
    const last = speakers.at(-1);
    if (last && last.alias === alias && last.eyes === eyes) {
      last.lines.push(serializeSpeechText(item.text));
      continue;
    }

    speakers.push({
      alias,
      eyes,
      lines: [serializeSpeechText(item.text)],
      lineNumber: 0,
    });
  }

  return speakers;
}

export function serializeZenPage(
  page: Pick<DraftPage, "title" | "meta" | "tts">,
  aliases: Map<string, ZenAliasTarget>,
) {
  const voiceAliases = createVoiceAliasMap(aliases);
  const lines: string[] = [];
  const title = page.title.trim();
  if (!title) {
    lines.push("---");
  } else {
    lines.push(`# ${title}`);
  }

  const tags = page.meta.tags.filter(Boolean);
  if (tags.length > 0) {
    lines.push(tags.map((tag) => `#${tag}`).join(" "));
  }

  const speakers = toSpeakerBlocks(page.tts, voiceAliases);
  for (const speaker of speakers) {
    if (lines.at(-1) !== "---") {
      lines.push("");
    }

    lines.push(speaker.eyes ? `@${speaker.alias} ${speaker.eyes}` : `@${speaker.alias}`);
    for (const line of speaker.lines) {
      lines.push(line);
    }
  }

  return `${lines.join("\n")}\n`;
}

import type { AvatarType, DraftPage, VoiceOption } from "@/_schemas";

export type ZenParseError = {
  line: number;
  message: string;
};

export type ZenAliasTarget = {
  voice: VoiceOption;
  avatarType: AvatarType;
};

export type ZenSpeakerBlock = {
  alias: string;
  eyes?: string;
  lines: string[];
  lineNumber: number;
};

export type ZenDraftPage = {
  title: string;
  tags: string[];
  speakers: ZenSpeakerBlock[];
  lineNumber: number;
};

export type ZenParseState = {
  pages: ZenDraftPage[];
  currentPage: ZenDraftPage | null;
  currentSpeaker: ZenSpeakerBlock | null;
  errors: ZenParseError[];
  aliases: Map<string, ZenAliasTarget>;
};

export type ZenLineHandler = {
  id: string;
  /** Higher runs first. */
  priority: number;
  match: (line: string, state: ZenParseState) => boolean;
  apply: (input: { line: string; lineNumber: number; state: ZenParseState }) => void;
};

export type ParseZenScriptOptions = {
  aliases: Map<string, ZenAliasTarget>;
  /** Extra line handlers merged by priority. */
  handlers?: ZenLineHandler[];
};

export type ParseZenScriptResult = {
  pages: DraftPage[];
  errors: ZenParseError[];
};

import type { CommentsPageFormValues } from "@/app/features/page/model/page-form-schema";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import { applyTtsTextChange, applyTtsVoiceChange, createTtsInput } from "@/app/features/tts";
import { commentGroupDisplayText } from "@/app/features/comments/resolve-comment-groups";
import type { CommentReader } from "@/_schemas/project/comments";

function voiceKey(voice: { provider: string; voiceName?: string; voiceVersion?: string }) {
  return `${voice.provider}::${voice.voiceName ?? ""}::${voice.voiceVersion ?? ""}`;
}

function createReadingTts(reader: Exclude<CommentReader, null>, text: string): TtsFormValues {
  const draft = createTtsInput([], undefined);
  return applyTtsTextChange(
    applyTtsVoiceChange(draft, {
      provider: reader.provider,
      voiceName: reader.voiceName,
      voiceVersion: reader.voiceVersion,
    }),
    text,
  );
}

function syncReadingTts(
  current: TtsFormValues | undefined,
  reader: Exclude<CommentReader, null>,
  text: string,
): TtsFormValues {
  const base = current ?? createReadingTts(reader, text);
  let next = base;
  if (voiceKey(next) !== voiceKey(reader)) {
    next = applyTtsVoiceChange(next, {
      provider: reader.provider,
      voiceName: reader.voiceName,
      voiceVersion: reader.voiceVersion,
    });
  }
  if (next.text !== text) {
    next = applyTtsTextChange(next, text);
  }
  return next;
}

export function reconcileCommentReadings(page: CommentsPageFormValues): CommentsPageFormValues {
  const commentsById = new Map(page.comments.map((comment) => [comment.id, comment]));
  const ttsById = new Map(page.tts.map((item) => [item.id, item]));
  const previousReadingIds = new Set(
    page.commentGroups.flatMap((group) => (group.readingTtsId ? [group.readingTtsId] : [])),
  );
  const reader = page.meta.commentReader;

  if (reader === null) {
    const commentGroups = page.commentGroups.map((group) =>
      group.readingTtsId === null ? group : { ...group, readingTtsId: null },
    );
    return {
      ...page,
      commentGroups,
      tts: page.tts.filter((item) => !previousReadingIds.has(item.id)),
    };
  }

  const nextTtsById = new Map(
    page.tts.filter((item) => !previousReadingIds.has(item.id)).map((item) => [item.id, item]),
  );
  const commentGroups = page.commentGroups.map((group) => {
    const text = commentGroupDisplayText(group, commentsById);
    const current = group.readingTtsId ? ttsById.get(group.readingTtsId) : undefined;
    const reading = syncReadingTts(current, reader, text);
    nextTtsById.set(reading.id, reading);
    return { ...group, readingTtsId: reading.id };
  });

  return {
    ...page,
    commentGroups,
    tts: [...nextTtsById.values()],
  };
}

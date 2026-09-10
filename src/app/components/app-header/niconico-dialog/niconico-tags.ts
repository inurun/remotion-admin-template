export const NICONICO_CHARACTER_TAGS: readonly string[] = [
  "ずんだもん",
  "あんこもん",
  "冥鳴ひまり",
  "小夜/sayo",
  "櫻歌ミコ",
  "重音テト",
  "双葉湊音",
];

export function createNiconicoTags(configuredTags: string[]): string[] {
  const tags = [...new Set(configuredTags.map((tag) => tag.trim()).filter(Boolean))];
  if (tags.length > 6) throw new Error("At most 6 configured Niconico tags are allowed");

  const candidates = NICONICO_CHARACTER_TAGS.filter((tag) => !tags.includes(tag));
  while (tags.length < 6) {
    const [tag] = candidates.splice(Math.floor(Math.random() * candidates.length), 1);
    tags.push(tag!);
  }
  return tags;
}

export function getConfiguredNiconicoTags(tags: string[]): string[] {
  return tags.filter((tag) => !NICONICO_CHARACTER_TAGS.includes(tag));
}

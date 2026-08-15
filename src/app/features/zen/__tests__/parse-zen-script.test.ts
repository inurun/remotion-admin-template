import { describe, expect, it } from "vitest";
import type { VoiceOption } from "@/_schemas";
import { createAliasMap } from "@/app/features/zen/create-alias-map";
import { parseZenScript } from "@/app/features/zen/parse-zen-script";
import type { VoiceSettings } from "@/app/features/settings/storage/use-settings-store";

function voice(
  voiceName: string,
  displayName: string,
  provider: VoiceOption["provider"] = "voicevox",
): VoiceOption {
  return { provider, voiceName, voiceVersion: "", displayName };
}

function aliases(entries: Array<{ alias: string; voice: VoiceOption }>) {
  const voices = entries.map((entry) => entry.voice);
  const voiceSettings = Object.fromEntries(
    entries.map((entry) => [
      `${entry.voice.provider}::${entry.voice.voiceName}::`,
      { label: entry.voice.displayName, alias: entry.alias, hotkey: "" } satisfies VoiceSettings,
    ]),
  );
  return createAliasMap(voices, voiceSettings);
}

describe("parseZenScript", () => {
  const { aliases: aliasMap } = aliases([
    { alias: "zunda", voice: voice("3", "Zunda") },
    { alias: "himari", voice: voice("14", "Himari") },
    { alias: "sayo", voice: voice("46", "Sayo") },
    { alias: "miko", voice: voice("43", "Miko") },
    { alias: "anko", voice: voice("113", "Anko") },
    { alias: "futaba", voice: voice("futaba-minato_ja_JP", "Futaba", "voicepeak") },
  ]);

  it("parses pages, tags, speakers, eyes, and double-space newlines", () => {
    const source = `# ページタイトル #news #travel

@zunda
ここにTTSテキストとavatarを書く
改行は2TTSとして分離する

@himari
文章中の半角スペース2つで  TTS内の改行として処理

@sayo shaded-open
avatar指定行でeyesの指定だけ可能に

#tag1 #tag2

@miko
どうしてもっていうんなら？

@anko
なんだこいつ
どうしてももくそもないもん

# ページ2

@futaba
ページ2のコンテンツだよ
`;

    const result = parseZenScript(source, { aliases: aliasMap });

    expect(result.errors).toEqual([]);
    expect(result.pages).toHaveLength(2);

    const page1 = result.pages[0];
    expect(page1.type).toBe("main");
    expect(page1.title).toBe("ページタイトル");
    expect(page1.meta.tags).toEqual(["news", "travel", "tag1", "tag2"]);
    expect(page1.richText).toBeNull();
    expect(page1.tts.map((item) => item.text)).toEqual([
      "ここにTTSテキストとavatarを書く",
      "改行は2TTSとして分離する",
      "文章中の半角スペース2つで\nTTS内の改行として処理",
      "avatar指定行でeyesの指定だけ可能に",
      "どうしてもっていうんなら？",
      "なんだこいつ",
      "どうしてももくそもないもん",
    ]);
    expect(page1.tts[0]?.voiceName).toBe("3");
    expect(page1.tts[3]?.voiceName).toBe("46");
    expect(page1.tts[3]?.avatar?.eyes).toBe("shaded-opened");

    const page2 = result.pages[1];
    expect(page2.title).toBe("ページ2");
    expect(page2.tts).toHaveLength(1);
    expect(page2.tts[0]?.voiceName).toBe("futaba-minato_ja_JP");
  });

  it("parses untitled pages separated by ---", () => {
    const result = parseZenScript(
      `---
# タイトルあり
#tag1 #tag2

@zunda
本文1
---
#tag1 #tag2

@himari
本文2
---
`,
      { aliases: aliasMap },
    );

    expect(result.errors).toEqual([]);
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0]?.title).toBe("タイトルあり");
    expect(result.pages[0]?.meta.tags).toEqual(["tag1", "tag2"]);
    expect(result.pages[0]?.tts[0]?.text).toBe("本文1");
    expect(result.pages[1]?.title).toBe("");
    expect(result.pages[1]?.meta.tags).toEqual(["tag1", "tag2"]);
    expect(result.pages[1]?.tts[0]?.text).toBe("本文2");
  });

  it("starts an untitled page from the first speaker", () => {
    const result = parseZenScript(
      `@zunda
hello
`,
      { aliases: aliasMap },
    );

    expect(result.errors).toEqual([]);
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]?.title).toBe("");
    expect(result.pages[0]?.tts[0]?.text).toBe("hello");
  });

  it("skips consecutive and trailing separators", () => {
    const result = parseZenScript(
      `---
---
# ページ
@zunda
hello
---
---
`,
      { aliases: aliasMap },
    );

    expect(result.errors).toEqual([]);
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]?.title).toBe("ページ");
  });

  it("reports speech without a speaker", () => {
    const result = parseZenScript("hello\n", { aliases: aliasMap });

    expect(result.errors).toContainEqual({
      line: 1,
      message: "Speech requires a @speaker first.",
    });
  });

  it("reports unknown aliases and eyes", () => {
    const result = parseZenScript(
      `# Page

@missing
hello

@sayo no-such-eyes
hi
`,
      { aliases: aliasMap },
    );

    expect(result.pages).toEqual([]);
    expect(result.errors).toContainEqual({ line: 3, message: 'Unknown alias "@missing".' });
    expect(result.errors).toContainEqual({
      line: 6,
      message: 'Unknown eyes "no-such-eyes" for @sayo.',
    });
  });

  it("treats a later heading as a new page after speech", () => {
    const result = parseZenScript(
      `# ページ1
@zunda
hello
# ページ2
@himari
world
`,
      { aliases: aliasMap },
    );

    expect(result.errors).toEqual([]);
    expect(result.pages.map((page) => page.title)).toEqual(["ページ1", "ページ2"]);
  });
});

describe("createAliasMap", () => {
  it("detects duplicate aliases", () => {
    const { errors } = createAliasMap([voice("3", "Zunda"), voice("14", "Himari")], {
      "voicevox::3::": { label: "Zunda", alias: "zunda", hotkey: "" },
      "voicevox::14::": { label: "Himari", alias: "zunda", hotkey: "" },
    });

    expect(errors).toEqual([{ line: 0, message: 'Duplicate alias "zunda".' }]);
  });
});

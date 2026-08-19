import { describe, expect, it } from "vitest";
import { toNiconicoDescriptionHtml } from "../niconico-description-html";

describe("toNiconicoDescriptionHtml", () => {
  it("appends br to each line including blank lines", () => {
    const source = [
      "ほぼ毎日投稿です。日記セイシュンツー 2日目。",
      "おつうぽつ広告ありがとう。励みになってます。",
      "",
      "【オリジナル楽曲】放課後マーメイド / しぐれうい【やしきん】: https://www.youtube.com/watch?v=Hl7wjqa1zkw",
      "",
      "働いたらアボカド - ニコ百 https://dic.nicovideo.jp/id/5733129",
      "",
      "---",
      "",
      "有給: 8/8日",
      "",
      "- この動画は投稿者の個人的な日々を淡々と記録するものです",
      "- 過度な期待はしないでください",
      "- むしろAIが使われていない箇所はありません",
      "",
      "X: https://x.com/hami_inu",
      "",
      "VOICEVOX: 冥鳴ひまり ずんだもん 小夜/SAYO 櫻歌ミコ あんこもん",
      "VOICEPEAK: 重音テト",
      "VoisonaTalk: 双葉湊音",
      "なぐもりずの音楽室 https://nagumorizu.com",
      "動画制作: Remotion",
    ].join("\n");

    expect(toNiconicoDescriptionHtml(source)).toBe(
      [
        "ほぼ毎日投稿です。日記セイシュンツー 2日目。<br>",
        "おつうぽつ広告ありがとう。励みになってます。<br>",
        "<br>",
        "【オリジナル楽曲】放課後マーメイド / しぐれうい【やしきん】: https://www.youtube.com/watch?v=Hl7wjqa1zkw<br>",
        "<br>",
        "働いたらアボカド - ニコ百 https://dic.nicovideo.jp/id/5733129<br>",
        "<br>",
        "---<br>",
        "<br>",
        "有給: 8/8日<br>",
        "<br>",
        "- この動画は投稿者の個人的な日々を淡々と記録するものです<br>",
        "- 過度な期待はしないでください<br>",
        "- むしろAIが使われていない箇所はありません<br>",
        "<br>",
        "X: https://x.com/hami_inu<br>",
        "<br>",
        "VOICEVOX: 冥鳴ひまり ずんだもん 小夜/SAYO 櫻歌ミコ あんこもん<br>",
        "VOICEPEAK: 重音テト<br>",
        "VoisonaTalk: 双葉湊音<br>",
        "なぐもりずの音楽室 https://nagumorizu.com<br>",
        "動画制作: Remotion<br>",
      ].join(""),
    );
  });

  it("normalizes CRLF and does not double existing br tags", () => {
    expect(toNiconicoDescriptionHtml("hello\r\nworld<br/>\r\n\r\nend")).toBe(
      "hello<br>world<br><br>end<br>",
    );
  });
});

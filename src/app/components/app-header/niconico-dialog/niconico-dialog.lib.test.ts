import { describe, expect, it } from "vitest";
import { extractNiconicoVideoId } from "./niconico-dialog.lib";

describe("niconico video ids", () => {
  it("extracts niconico video ids from watch and shorts urls", () => {
    expect(extractNiconicoVideoId("https://www.nicovideo.jp/watch/sm9")).toBe("sm9");
    expect(extractNiconicoVideoId("https://nicovideo.jp/shorts/ss123")).toBe("ss123");
    expect(extractNiconicoVideoId("https://www.nicovideo.jp/watch/sm9?ref=x")).toBe("sm9");
    expect(extractNiconicoVideoId("http://www.nicovideo.jp/watch/sm9")).toBeUndefined();
    expect(extractNiconicoVideoId("https://www.youtube.com/watch?v=abc")).toBeUndefined();
    expect(extractNiconicoVideoId("not a url")).toBeUndefined();
  });
});

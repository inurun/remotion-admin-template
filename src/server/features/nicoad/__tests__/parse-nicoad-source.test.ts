import { describe, expect, it } from "vitest";
import {
  NicoadSourceError,
  parseNicoadVideoId,
  uniqueNicoadAdvertisers,
} from "../parse-nicoad-source";

describe("parseNicoadVideoId", () => {
  it("reads a raw video id", () => {
    expect(parseNicoadVideoId("sm46665240")).toBe("sm46665240");
  });

  it("reads a nicoad publish url", () => {
    expect(parseNicoadVideoId("https://nicoad.nicovideo.jp/video/publish/sm46665240")).toBe(
      "sm46665240",
    );
  });

  it("reads a watch url", () => {
    expect(parseNicoadVideoId("https://www.nicovideo.jp/watch/SM9")).toBe("sm9");
  });

  it("throws when no video id is present", () => {
    expect(() => parseNicoadVideoId("https://example.com")).toThrow(NicoadSourceError);
  });
});

describe("uniqueNicoadAdvertisers", () => {
  it("keeps the first sponsor per user and anonymous name", () => {
    expect(
      uniqueNicoadAdvertisers([
        { advertiserName: "Ada", message: "new", userId: 1 },
        { advertiserName: "Ada", message: "old", userId: 1 },
        { advertiserName: "Bob", message: "hi", userId: 2 },
        { advertiserName: "Anon", message: "one" },
        { advertiserName: "Anon", message: "two" },
      ]),
    ).toEqual([
      { name: "Ada", message: "new" },
      { name: "Bob", message: "hi" },
      { name: "Anon", message: "one" },
    ]);
  });
});

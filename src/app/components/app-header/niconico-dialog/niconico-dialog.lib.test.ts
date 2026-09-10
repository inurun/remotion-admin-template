import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBlankOutroBlock } from "@/app/features/page/lib/outro-block";
import { createBlankPageInput } from "@/app/features/page/lib/page-draft";
import {
  fromNiconicoFormValues,
  niconicoFormSchema,
  parentWorkIdsInputFromOutroItems,
  toNiconicoFormValues,
} from "./niconico-dialog.lib";

beforeEach(() => vi.spyOn(Math, "random").mockReturnValue(0));
afterEach(() => vi.restoreAllMocks());

describe("niconico dialog values", () => {
  it("shows configured tags and redraws character tags on save", () => {
    const meta = {
      title: "Nico",
      description: "desc",
      thumbnailTime: "01:23.456",
      parentWorkIds: ["sm9", "ss1"],
      tags: ["日記", "ゲーム", "実況", "音声合成", "ずんだもん", "あんこもん"],
    };

    const form = niconicoFormSchema.parse(toNiconicoFormValues(meta));
    expect(form.tags).toBe("日記 ゲーム 実況 音声合成");
    expect(fromNiconicoFormValues(form)).toEqual(meta);
  });

  it("parses whitespace-separated tags and removes duplicates on save", () => {
    const form = toNiconicoFormValues({
      title: "",
      description: "",
      thumbnailTime: "00:00.000",
      parentWorkIds: [],
      tags: ["日記", "ずんだもん", "あんこもん"],
    });
    expect(form.tags).toBe("日記");
    expect(fromNiconicoFormValues({ ...form, tags: " 日記\n日記  キャラ " }).tags).toEqual([
      "日記",
      "キャラ",
      "ずんだもん",
      "あんこもん",
      "冥鳴ひまり",
      "小夜/sayo",
    ]);
    expect(niconicoFormSchema.safeParse({ ...form, tags: "1 2 3 4 5 6 7" }).success).toBe(false);
  });

  it("parses parent work ids from free text", () => {
    expect(
      fromNiconicoFormValues(
        niconicoFormSchema.parse({
          title: "Nico",
          description: "",
          thumbnailTime: "00:00.000",
          parentWorkIds: "sm9 ss1, sm9",
          tags: "",
        }),
      ).parentWorkIds,
    ).toEqual(["sm9", "ss1"]);
  });

  it("rebuilds parent work ids from outro urls and drops existing extras", () => {
    const outro = createBlankPageInput({
      id: "outro-1",
      title: "Outro",
      type: "outro",
    });
    if (outro.type !== "outro") {
      throw new Error("expected outro");
    }

    expect(
      parentWorkIdsInputFromOutroItems([
        createBlankPageInput({ id: "main-1", title: "Main", type: "main" }),
        {
          ...outro,
          meta: {
            ...outro.meta,
            blocks: [
              createBlankOutroBlock({ id: "block-1", url: "https://www.nicovideo.jp/watch/sm9" }),
              createBlankOutroBlock({
                id: "block-2",
                url: "https://www.youtube.com/watch?v=abc",
              }),
              createBlankOutroBlock({
                id: "block-3",
                url: "https://www.nicovideo.jp/shorts/ss123",
              }),
              createBlankOutroBlock({ id: "block-4", url: "https://www.nicovideo.jp/watch/sm9" }),
            ],
          },
        },
      ]),
    ).toBe("sm9 ss123");
  });
});

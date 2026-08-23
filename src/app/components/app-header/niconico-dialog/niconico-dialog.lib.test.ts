import { describe, expect, it } from "vitest";
import { createBlankOutroBlock } from "@/app/features/page/lib/outro-block";
import { createBlankPageInput } from "@/app/features/page/lib/page-draft";
import {
  fromNiconicoFormValues,
  niconicoFormSchema,
  parentWorkIdsInputFromOutroItems,
  toNiconicoFormValues,
} from "./niconico-dialog.lib";

describe("niconico dialog values", () => {
  it("round-trips niconico meta", () => {
    const meta = {
      title: "Nico",
      description: "desc",
      thumbnailTime: "01:23.456",
      parentWorkIds: ["sm9", "ss1"],
    };

    expect(fromNiconicoFormValues(niconicoFormSchema.parse(toNiconicoFormValues(meta)))).toEqual(
      meta,
    );
  });

  it("parses parent work ids from free text", () => {
    expect(
      fromNiconicoFormValues(
        niconicoFormSchema.parse({
          title: "Nico",
          description: "",
          thumbnailTime: "00:00.000",
          parentWorkIds: "sm9 ss1, sm9",
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

import { describe, expect, it } from "vitest";
import {
  fromNiconicoFormValues,
  niconicoFormSchema,
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
});

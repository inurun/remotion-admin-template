import { describe, expect, it } from "vitest";
import { recordIntroductions } from "../introduction-store";

const ada = {
  userId: 1,
  identityKey: "user:1",
  name: "Ada",
  message: "hello",
};

describe("recordIntroductions", () => {
  it("counts distinct videos for each advertiser", () => {
    const first = recordIntroductions({ advertisers: [] }, "sm1", [ada]);
    const repeated = recordIntroductions(first.store, "sm1", [ada]);
    const secondVideo = recordIntroductions(repeated.store, "sm2", [ada]);

    expect(first.advertisers[0]?.introductionCount).toBe(1);
    expect(repeated.advertisers[0]?.introductionCount).toBe(1);
    expect(secondVideo.advertisers[0]?.introductionCount).toBe(2);
    expect(secondVideo.store.advertisers[0]?.introducedVideoIds).toEqual(["sm1", "sm2"]);
  });

  it("keeps introductions when an advertiser is absent from a later fetch", () => {
    const first = recordIntroductions({ advertisers: [] }, "sm1", [ada]);
    const emptyFetch = recordIntroductions(first.store, "sm1", []);

    expect(emptyFetch.store).toEqual(first.store);
  });

  it("updates the latest display name without changing identity", () => {
    const first = recordIntroductions({ advertisers: [] }, "sm1", [ada]);
    const renamed = recordIntroductions(first.store, "sm2", [{ ...ada, name: "Ada 2" }]);

    expect(renamed.store.advertisers[0]).toMatchObject({
      identityKey: "user:1",
      name: "Ada 2",
      introducedVideoIds: ["sm1", "sm2"],
    });
  });
});

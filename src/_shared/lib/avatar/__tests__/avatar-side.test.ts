import { describe, expect, it } from "vitest";
import { getAvatarSide } from "@/_shared/lib/avatar/avatar-side";

describe("avatar side", () => {
  it("places the demo avatar on the left", () => {
    expect(getAvatarSide("demo")).toBe("left");
  });
});

import { describe, expect, it } from "vitest";
import {
  getAvatarTypeByVoiceName,
  resolveAvatarSettings,
} from "@/_shared/lib/avatar/avatar-settings";

describe("avatar settings", () => {
  it("falls back unknown voice names to demo", () => {
    expect(getAvatarTypeByVoiceName("voice")).toBe("demo");
    expect(getAvatarTypeByVoiceName(undefined)).toBe("demo");
  });

  it("normalizes appearance values for the mapped avatar type", () => {
    expect(
      resolveAvatarSettings("demo", {
        base: "normal",
        eyes: "opened",
        mouth: "opened",
      }),
    ).toEqual({
      base: "normal",
      eyes: "opened",
      mouth: "opened",
    });

    expect(
      resolveAvatarSettings("demo", {
        base: "unknown",
        eyes: "wink",
        mouth: "wavy-opened",
      }),
    ).toEqual({
      base: "normal",
      eyes: "opened",
      mouth: "opened",
    });
  });
});

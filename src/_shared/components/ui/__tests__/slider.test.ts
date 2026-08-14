import { describe, expect, it } from "vitest";
import { getSliderValues } from "@/_shared/components/ui/slider.lib";

describe("getSliderValues", () => {
  it("uses controlled array values", () => {
    expect(getSliderValues([20, 80], undefined, 0, 100)).toEqual([20, 80]);
  });

  it("uses controlled number values", () => {
    expect(getSliderValues(20, undefined, 0, 100)).toEqual([20]);
  });

  it("uses default array values when uncontrolled", () => {
    expect(getSliderValues(undefined, [10, 90], 0, 100)).toEqual([10, 90]);
  });

  it("uses default number values when uncontrolled", () => {
    expect(getSliderValues(undefined, 10, 0, 100)).toEqual([10]);
  });

  it("falls back to the slider range", () => {
    expect(getSliderValues(undefined, undefined, 0, 100)).toEqual([0, 100]);
  });
});

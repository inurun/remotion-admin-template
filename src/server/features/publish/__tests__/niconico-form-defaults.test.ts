import { describe, expect, it } from "vitest";
import { niconicoGarageFormFields } from "../niconico-form-defaults";

describe("niconico garage form defaults", () => {
  it("keeps unique keys and required inherited values", () => {
    const byKey = Object.fromEntries(niconicoGarageFormFields.map((field) => [field.key, field]));
    expect(Object.keys(byKey)).toHaveLength(niconicoGarageFormFields.length);
    expect(byKey.genre).toMatchObject({
      control: "combobox",
      value: "エンターテイメント",
      section: "main",
    });
    expect(byKey.series).toMatchObject({
      control: "combobox",
      value: "日記 セイシュンツー",
      section: "main",
    });
    expect(byKey.visibility).toMatchObject({ control: "combobox", value: "公開" });
    expect(byKey.publishTiming).toMatchObject({ control: "radio", value: "すぐに公開" });
    expect(niconicoGarageFormFields.some((field) => field.section === "options")).toBe(true);
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pageFormSchema } from "@/app/features/page/model/page-form-schema";
import { transitionFormSchema } from "@/app/features/page/model/transition-form-schema";
import { ttsFormSchema } from "@/app/features/tts/model/tts-form-schema";
import { projectSettingsFormSchema } from "@/app/features/project/model/project-settings-form-schema";
import { scheduleFormSchema } from "@/app/features/schedule/model/schedule-form-schema";
import {
  savedPageSchema,
  savedProjectSchema,
  savedScheduleItemSchema,
  savedTransitionSchema,
  savedTtsSchema,
} from "@/_schemas";
import {
  savePageItemSchema,
  saveProjectSettingsSchema,
  saveTtsItemSchema,
  saveTransitionItemSchema,
} from "@/server/features/project/contract";
import { saveScheduleItemSchema } from "@/server/features/schedule/contract";

function source(path: string) {
  return readFileSync(path, "utf8");
}

const inputContractNames = [
  "pageInputSchema",
  "ttsInputSchema",
  "transitionInputSchema",
  "sequenceItemInputSchema",
  "projectSettingsInputSchema",
];

describe("schema boundaries", () => {
  it("does not alias Feature form schemas from persistence or API contracts", () => {
    expect(pageFormSchema).not.toBe(savePageItemSchema);
    expect(pageFormSchema).not.toBe(savedPageSchema);
    expect(ttsFormSchema).not.toBe(saveTtsItemSchema);
    expect(ttsFormSchema).not.toBe(savedTtsSchema);
    expect(transitionFormSchema).not.toBe(saveTransitionItemSchema);
    expect(transitionFormSchema).not.toBe(savedTransitionSchema);
    expect(projectSettingsFormSchema).not.toBe(saveProjectSettingsSchema);
    expect(scheduleFormSchema).not.toBe(saveScheduleItemSchema);
    expect(scheduleFormSchema).not.toBe(savedScheduleItemSchema);
  });

  it("keeps Feature form and ChangeSet sources from importing input or saved aggregates", () => {
    const formFiles = [
      "src/app/features/page/model/page-form-schema.ts",
      "src/app/features/page/model/transition-form-schema.ts",
      "src/app/features/tts/model/tts-form-schema.ts",
      "src/app/features/project/model/project-settings-form-schema.ts",
      "src/app/features/schedule/model/schedule-form-schema.ts",
    ];
    for (const file of [
      ...formFiles,
      "src/server/features/project/contract.ts",
      "src/server/features/schedule/contract.ts",
    ]) {
      const contents = source(file);
      for (const name of inputContractNames) {
        expect(contents).not.toMatch(name);
      }
      expect(contents).not.toMatch("savedPageSchema");
      expect(contents).not.toMatch("savedTtsSchema");
      expect(contents).not.toMatch("savedScheduleItemSchema");
      expect(contents).not.toMatch(/from ["']@\/_schemas\/project\/page["']/);
      expect(contents).not.toMatch(/from ["']@\/_schemas\/project\/tts["']/);
    }
    for (const file of formFiles) {
      const contents = source(file);
      expect(contents).not.toMatch(/from ["']@\/_schemas["']/);
      expect(contents).not.toMatch(/from ["']@\/_schemas\/project["']/);
    }
  });

  it("keeps persistence files to saved schemas and types", () => {
    const files = [
      "src/_schemas/project/page.ts",
      "src/_schemas/project/tts.ts",
      "src/_schemas/project/primitives.ts",
      "src/_schemas/project/project.ts",
      "src/_schemas/schedule/schedule.ts",
    ];
    for (const file of files) {
      const contents = source(file);
      for (const name of inputContractNames) {
        expect(contents).not.toMatch(name);
      }
      expect(contents).not.toMatch(/\bPageInput\b/);
      expect(contents).not.toMatch(/\bTtsInput\b/);
      expect(contents).not.toMatch(/\bProjectSettingsInput\b/);
      expect(contents).not.toMatch(/\bTransitionInput\b/);
      expect(contents).not.toMatch(/\bSequenceItemInput\b/);
    }
  });

  it("enumerates Feature form and ChangeSet fields instead of reusing aggregates", () => {
    const pageForm = source("src/app/features/page/model/page-form-schema.ts");
    expect(pageForm).toContain("title: z.string()");
    expect(pageForm).toContain("padBeforeSec:");
    expect(pageForm).toContain('type: z.literal("main")');
    expect(pageForm).toContain("tts: z.array(ttsFormSchema)");

    const ttsForm = source("src/app/features/tts/model/tts-form-schema.ts");
    expect(ttsForm).toContain("text: z.string()");
    expect(ttsForm).toContain('provider: z.literal("voisona")');

    const contract = source("src/server/features/project/contract.ts");
    expect(contract).toContain("export const saveTtsItemSchema");
    expect(contract).toContain("export const savePageItemSchema");
    expect(contract).toContain("export const saveProjectChangesRequestSchema");
    expect(contract).not.toMatch(/from ["']@\/app\/features/);

    const scheduleForm = source("src/app/features/schedule/model/schedule-form-schema.ts");
    expect(scheduleForm).toContain("date: z.iso.date()");
    expect(scheduleForm).toContain("title: z.string().min(1)");
    expect(scheduleForm).toContain("description: z.string()");
  });

  it("keeps generated audio fields on saved TTS and out of form TTS", () => {
    const formTts = ttsFormSchema.parse({
      id: "tts",
      provider: "voisona",
      text: "hello",
      voiceName: "voice",
    });

    expect(formTts).not.toHaveProperty("audio");
    expect(formTts).not.toHaveProperty("durationSec");
    expect(
      ttsFormSchema.parse({
        ...formTts,
        audio: { src: "/tts/hello.wav" },
        durationSec: 1,
      }),
    ).not.toHaveProperty("audio");

    const saved = savedTtsSchema.parse({
      ...formTts,
      durationSec: 1,
      audio: { src: "/tts/hello.wav" },
    });
    expect(saved.audio.src).toBe("/tts/hello.wav");
    expect(saved.durationSec).toBe(1);
  });

  it("keeps page duration on saved pages only", () => {
    const formPage = pageFormSchema.parse({
      id: "page",
      title: "Page",
      type: "main",
      padBeforeSec: 0,
      padAfterSec: 0,
      richText: "",
      tts: [],
    });
    expect(formPage).not.toHaveProperty("durationSec");
    expect(
      pageFormSchema.parse({
        ...formPage,
        durationSec: 1.5,
      }),
    ).not.toHaveProperty("durationSec");

    expect(
      savedPageSchema.parse({
        ...formPage,
        durationSec: 1.5,
      }).durationSec,
    ).toBe(1.5);
  });

  it("does not re-export input aggregate schemas from _schemas barrels", async () => {
    const publicApi = await import("@/_schemas");
    const projectApi = await import("@/_schemas/project");
    const pageApi = await import("@/_schemas/project/page");
    const ttsApi = await import("@/_schemas/project/tts");
    const primitivesApi = await import("@/_schemas/project/primitives");
    for (const schemas of [publicApi, projectApi, pageApi, ttsApi, primitivesApi]) {
      expect(schemas).not.toHaveProperty("pageInputSchema");
      expect(schemas).not.toHaveProperty("ttsInputSchema");
      expect(schemas).not.toHaveProperty("transitionInputSchema");
      expect(schemas).not.toHaveProperty("sequenceItemInputSchema");
      expect(schemas).not.toHaveProperty("projectSettingsInputSchema");
      expect(schemas).not.toHaveProperty("PageInput");
      expect(schemas).not.toHaveProperty("TtsInput");
      expect(schemas).not.toHaveProperty("ProjectSettingsInput");
    }
    expect(publicApi).toHaveProperty("savedProjectSchema");
    expect(publicApi).toHaveProperty("savedPageSchema");
    expect(publicApi).toHaveProperty("savedTtsSchema");
    expect(publicApi).toHaveProperty("savedSchedulesSchema");
    expect(projectApi).toHaveProperty("savedProjectSchema");
  });

  it("does not build form values from SavedProject.partial", () => {
    expect(() =>
      savedProjectSchema.parse({
        meta: { title: "project", description: "", width: 1920, height: 1080 },
        pages: [],
      }),
    ).not.toThrow();
    expect(pageFormSchema.safeParse({ id: "page" }).success).toBe(false);
  });
});

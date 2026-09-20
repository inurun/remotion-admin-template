import { CompletionContext } from "@codemirror/autocomplete";
import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import type { VoiceOption } from "@/_schemas";
import { createTtsComposeCompletionSource } from "@/app/features/tts/lib/tts-compose-completion";

const voice: VoiceOption = {
  provider: "voisona",
  voiceName: "demo",
  displayName: "Demo",
};

describe("createTtsComposeCompletionSource", () => {
  const complete = createTtsComposeCompletionSource(voice);
  const labels = (doc: string) =>
    complete(new CompletionContext(EditorState.create({ doc }), doc.length, false))?.options.map(
      (option) => option.label,
    );

  it("completes available commands at the start", () => {
    expect(labels("/")).toEqual(["/b.normal", "/e.opened", "/e.shaded-opened", "/m.opened"]);
    expect(labels("/e.sh")).toEqual(["/e.shaded-opened"]);
  });

  it("does not offer a command field twice", () => {
    expect(labels("/e.opened /")).toEqual(["/b.normal", "/m.opened"]);
  });

  it("stops completing after body text begins", () => {
    expect(labels("Body /")).toBeUndefined();
    expect(labels("/e.opened Body /")).toBeUndefined();
  });
});

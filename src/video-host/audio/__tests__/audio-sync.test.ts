// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import type { AudioClip } from "../audio-manifest";
import { createAudioSync } from "../audio-sync";

const clip = (id: string, startSec: number): AudioClip => ({
  id,
  src: `tts/${id}.wav`,
  startSec,
  durationSec: 1,
  volume: 1,
});

function setup() {
  const container = document.createElement("div");
  container.innerHTML = '<audio id="a" data-start="0"></audio>';
  const sync = createAudioSync(container, [clip("a", 0)]);
  return { container, sync };
}

describe("createAudioSync", () => {
  it("keeps the static elements while the manifest is unchanged", () => {
    const { container, sync } = setup();
    const original = container.firstElementChild;

    expect(sync([clip("a", 0)])).toBe(false);
    expect(container.firstElementChild).toBe(original);
  });

  it("replaces every element when the manifest changes", () => {
    const { container, sync } = setup();

    expect(sync([clip("a", 0.5), clip("b", 2)])).toBe(true);
    const audios = [...container.querySelectorAll("audio")];
    expect(audios.map((audio) => [audio.id, audio.dataset["start"], audio.preload])).toEqual([
      ["a", "0.5", "auto"],
      ["b", "2", "auto"],
    ]);
    expect(audios[1]?.dataset["trackIndex"]).toBe("101");
    expect(sync([clip("a", 0.5), clip("b", 2)])).toBe(false);
  });
});

import { toAudioAttributes } from "./audio-attributes";
import type { AudioClip } from "./audio-manifest";

function applyAttributes(audio: HTMLAudioElement, attributes: [string, string][]) {
  const names = new Set(attributes.map(([name]) => name));
  for (const name of audio.getAttributeNames()) {
    if (!names.has(name)) {
      audio.removeAttribute(name);
    }
  }
  for (const [name, value] of attributes) {
    if (audio.getAttribute(name) !== value) {
      audio.setAttribute(name, value);
    }
  }
}

/**
 * Keeps the static `<audio>` set in step with runtime data. The elements in the document
 * stand for `initial`. Elements are keyed by clip id and updated in place, so an edit that
 * only moves clips does not reload their media (every new element is another fetch and
 * decode before playback can run). The HF runtime rescans media once the runtime-data
 * handler resolves.
 */
export function createAudioSync(container: HTMLElement, initial: AudioClip[]) {
  let currentKey = JSON.stringify(initial);
  return (clips: AudioClip[]) => {
    const key = JSON.stringify(clips);
    if (key === currentKey) {
      return false;
    }
    currentKey = key;
    const existing = new Map(
      [...container.querySelectorAll("audio")].map((audio) => [audio.id, audio]),
    );
    clips.forEach((clip, index) => {
      const attributes = toAudioAttributes(clip, index);
      const audio = existing.get(clip.id);
      existing.delete(clip.id);
      if (audio && audio.getAttribute("src") === clip.src) {
        applyAttributes(audio, attributes);
        return;
      }
      audio?.remove();
      const created = document.createElement("audio");
      applyAttributes(created, attributes);
      container.appendChild(created);
    });
    for (const audio of existing.values()) {
      audio.remove();
    }
    return true;
  };
}

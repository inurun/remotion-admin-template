/** @jsxImportSource @inurun/vite-plugin-hyperframes-jsx */
import "./styles.css";
import {
  mountComposition,
  registerClock,
  type Clock,
  type VideoConfig,
} from "@inurun/vite-plugin-hyperframes-jsx/runtime";
import { video } from "@/video";
import { HF_AUDIO_CONTAINER_ID } from "./audio/audio-attributes";
import { createAudioManifest } from "./audio/audio-manifest";
import { createAudioSync } from "./audio/audio-sync";
import { HF_COMPOSITION_ID, HF_DATA_CHANNEL, HF_DATA_ELEMENT_ID, type HfMode } from "./constants";
import { hfDataSchema, type HfData } from "./contract";
import { createMountQueue } from "./mount-queue";

declare global {
  interface Window {
    __hyperframes?: {
      registerRuntimeDataHandler?: (
        channel: string,
        handler: (payload: unknown) => unknown,
      ) => () => void;
    };
  }
}

function getStage() {
  const stage = document.querySelector<HTMLElement>(`[data-composition-id="${HF_COMPOSITION_ID}"]`);
  if (!stage) {
    throw new Error("composition root missing");
  }
  const fps = Number(stage.dataset["fps"]);
  const config: VideoConfig = {
    fps,
    width: Number(stage.dataset["width"]),
    height: Number(stage.dataset["height"]),
    durationInFrames: Math.round(Number(stage.dataset["duration"]) * fps),
  };
  return { stage, config };
}

function readEmbeddedData() {
  const text = document.getElementById(HF_DATA_ELEMENT_ID)?.textContent;
  if (!text) {
    throw new Error(`#${HF_DATA_ELEMENT_ID} missing`);
  }
  return hfDataSchema.parse(JSON.parse(text));
}

function main() {
  const { stage, config } = getStage();
  video.onMode?.(stage.dataset["mode"] as HfMode);
  const embedded = readEmbeddedData();
  const audioContainer = document.getElementById(HF_AUDIO_CONTAINER_ID);
  if (!audioContainer) {
    throw new Error(`#${HF_AUDIO_CONTAINER_ID} missing`);
  }
  const manifestOf = (data: HfData) =>
    createAudioManifest(data.project, data.timeline, config.fps, video);
  const syncAudio = createAudioSync(audioContainer, manifestOf(embedded));
  let clock: Clock | null = null;
  let current: HTMLElement | null = null;

  // Mount into a hidden container and swap it in once ready, so an update never flashes blank.
  const mountData = async (data: HfData) => {
    const container = document.createElement("div");
    container.style.cssText = "position:absolute;inset:0;visibility:hidden";
    stage.appendChild(container);
    try {
      const composition = await mountComposition(
        <video.Composition {...data} />,
        container,
        config,
      );
      if (clock) {
        clock.setComposition(composition);
      } else {
        clock = registerClock(HF_COMPOSITION_ID, composition, config.fps, config.durationInFrames);
      }
    } catch (error) {
      container.remove();
      throw error;
    }
    container.style.visibility = "";
    current?.remove();
    current = container;
    syncAudio(manifestOf(data));
  };

  const queue = createMountQueue(mountData);

  // Retained data (e.g. after a duration-change reload) arrives synchronously here.
  window.__hyperframes?.registerRuntimeDataHandler?.(HF_DATA_CHANNEL, (payload) =>
    queue.schedule(hfDataSchema.parse(payload)),
  );
  if (queue.isIdle()) {
    void queue.schedule(embedded);
  }
}

main();

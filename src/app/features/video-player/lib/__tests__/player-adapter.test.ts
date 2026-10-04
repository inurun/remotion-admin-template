import { describe, expect, it, vi } from "vitest";
import {
  createPlayerAdapter,
  frameToSeconds,
  secondsToFrame,
  type PlayerElement,
} from "../player-adapter";

const FPS = 30;

function createFakePlayer(duration = 10) {
  const target = new EventTarget();
  const player = {
    currentTime: 0,
    duration,
    paused: true,
    volume: 1,
    play: vi.fn(() => {
      player.paused = false;
      target.dispatchEvent(new Event("play"));
    }),
    pause: vi.fn(() => {
      player.paused = true;
      target.dispatchEvent(new Event("pause"));
    }),
    // Like HyperframesPlayer: parks playback without a `pause` event.
    seek: vi.fn((time: number) => {
      player.currentTime = time;
      player.paused = true;
    }),
    addEventListener: (type: string, listener: () => void) =>
      target.addEventListener(type, listener),
    removeEventListener: (type: string, listener: () => void) =>
      target.removeEventListener(type, listener),
    fire: (type: string) => target.dispatchEvent(new Event(type)),
  };
  return player satisfies PlayerElement;
}

function createScheduler() {
  const callbacks = new Map<number, () => void>();
  let nextId = 1;
  return {
    request: (callback: () => void) => {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    },
    cancel: (id: number) => {
      callbacks.delete(id);
    },
    flush: () => {
      const pending = [...callbacks.values()];
      callbacks.clear();
      for (const callback of pending) {
        callback();
      }
    },
    get size() {
      return callbacks.size;
    },
  };
}

function setup() {
  const scheduler = createScheduler();
  const adapter = createPlayerAdapter({ fps: FPS, scheduler });
  const player = createFakePlayer();
  adapter.setPlayerRef(player);
  return { adapter, player, scheduler };
}

describe("frame/time conversion", () => {
  it("round-trips every frame despite float error", () => {
    for (let frame = 0; frame < 3000; frame += 1) {
      expect(secondsToFrame(frameToSeconds(frame, FPS), FPS)).toBe(frame);
    }
  });

  it("floors mid-frame times and clamps negatives", () => {
    expect(secondsToFrame(1.0499, FPS)).toBe(31);
    expect(secondsToFrame(-1, FPS)).toBe(0);
    expect(frameToSeconds(-5, FPS)).toBe(0);
  });
});

describe("createPlayerAdapter", () => {
  it("reads the current frame from the player's seconds", () => {
    const { adapter, player } = setup();
    player.currentTime = 2.5;
    expect(adapter.getCurrentFrame()).toBe(75);
  });

  it("seeks in seconds and emits seeked with the frame", () => {
    const { adapter, player } = setup();
    const seeked = vi.fn();
    adapter.addEventListener("seeked", seeked);
    adapter.seekTo(45);
    expect(player.seek).toHaveBeenCalledWith(1.5);
    expect(seeked).toHaveBeenCalledWith({ detail: { frame: 45 } });
    expect(adapter.getCurrentFrame()).toBe(45);
  });

  it("keeps playing after a seek while playing", () => {
    const { adapter, player } = setup();
    adapter.play();
    adapter.seekTo(10);
    expect(player.play).toHaveBeenCalledTimes(2);
    expect(adapter.isPlaying()).toBe(true);
  });

  it("forwards play/pause/ended and drives frameupdate per animation frame", () => {
    const { adapter, player, scheduler } = setup();
    const events: string[] = [];
    const frames: number[] = [];
    adapter.addEventListener("play", () => events.push("play"));
    adapter.addEventListener("pause", () => events.push("pause"));
    adapter.addEventListener("ended", () => events.push("ended"));
    adapter.addEventListener("frameupdate", ({ detail }) => frames.push(detail.frame));

    adapter.play();
    player.currentTime = 1 / FPS;
    scheduler.flush();
    scheduler.flush();
    player.currentTime = 3 / FPS;
    scheduler.flush();
    expect(frames).toEqual([1, 3]);

    adapter.pause();
    expect(scheduler.size).toBe(0);

    player.play();
    player.currentTime = 10;
    player.paused = true;
    player.fire("ended");
    expect(events).toEqual(["play", "pause", "play", "ended"]);
    expect(frames.at(-1)).toBe(300);
    expect(scheduler.size).toBe(0);
  });

  it("emits frameupdate from timeupdate while paused", () => {
    const { adapter, player } = setup();
    const frameupdate = vi.fn();
    adapter.addEventListener("frameupdate", frameupdate);
    player.currentTime = 2;
    player.fire("timeupdate");
    player.fire("timeupdate");
    expect(frameupdate).toHaveBeenCalledTimes(1);
    expect(frameupdate).toHaveBeenCalledWith({ detail: { frame: 60 } });
  });

  it("keeps volume across players and emits volumechange", () => {
    const { adapter } = setup();
    const volumechange = vi.fn();
    adapter.addEventListener("volumechange", volumechange);
    adapter.setVolume(1.4);
    expect(adapter.getVolume()).toBe(1);
    adapter.setVolume(0.25);
    expect(volumechange).toHaveBeenLastCalledWith({ detail: { volume: 0.25 } });

    const next = createFakePlayer();
    adapter.setPlayerRef(next);
    expect(next.volume).toBe(0.25);
  });

  it("restores the playhead when a reloaded document becomes ready", () => {
    const { adapter, player } = setup();
    adapter.seekTo(90);
    player.currentTime = 0;
    player.duration = 2;
    player.fire("ready");
    expect(player.seek).toHaveBeenLastCalledWith(59 / FPS);
    expect(adapter.getCurrentFrame()).toBe(59);
  });

  it("stops listening to a detached player", () => {
    const { adapter, player } = setup();
    const play = vi.fn();
    adapter.addEventListener("play", play);
    adapter.setPlayerRef(null);
    player.fire("play");
    expect(play).not.toHaveBeenCalled();
    expect(adapter.isPlaying()).toBe(false);
    expect(adapter.getCurrentFrame()).toBe(0);
  });
});

// Frame-based player control API on top of `<hyperframes-player>`.
// Consumers speak frames; the player speaks seconds. The conversion lives here only.

export type PlayerEventMap = {
  frameupdate: { frame: number };
  seeked: { frame: number };
  play: undefined;
  pause: undefined;
  ended: undefined;
  volumechange: { volume: number };
};

export type PlayerEventName = keyof PlayerEventMap;

export type PlayerListener<T extends PlayerEventName> = (event: {
  detail: PlayerEventMap[T];
}) => void;

/** The subset of `HyperframesPlayer` the adapter drives. */
export type PlayerElement = {
  play: () => void;
  pause: () => void;
  seek: (timeInSeconds: number) => void;
  readonly currentTime: number;
  readonly duration: number;
  readonly paused: boolean;
  volume: number;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

export type PlayerAdapter = {
  addEventListener: <T extends PlayerEventName>(name: T, callback: PlayerListener<T>) => void;
  removeEventListener: <T extends PlayerEventName>(name: T, callback: PlayerListener<T>) => void;
  getCurrentFrame: () => number;
  getVolume: () => number;
  isPlaying: () => boolean;
  pause: () => void;
  play: () => void;
  seekTo: (frame: number) => void;
  setPlayerRef: (player: PlayerElement | null) => void;
  setVolume: (volume: number) => void;
  toggle: () => void;
};

type FrameScheduler = {
  request: (callback: () => void) => number;
  cancel: (id: number) => void;
};

const browserScheduler: FrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
};

/** Absorbs float error so `n / fps` maps back to frame `n`, as HyperFrames seeks exact frame times. */
const FRAME_EPSILON = 1e-3;

export function secondsToFrame(seconds: number, fps: number) {
  return Math.max(0, Math.floor(seconds * fps + FRAME_EPSILON));
}

export function frameToSeconds(frame: number, fps: number) {
  return Math.max(0, frame) / fps;
}

export function createPlayerAdapter({
  fps,
  initialVolume = 1,
  scheduler = browserScheduler,
}: {
  fps: number;
  initialVolume?: number;
  scheduler?: FrameScheduler;
}): PlayerAdapter {
  let player: PlayerElement | null = null;
  let volume = initialVolume;
  let frame = 0;
  let rafId: number | null = null;
  const listeners = new Map<PlayerEventName, Set<PlayerListener<PlayerEventName>>>();

  const emit = <T extends PlayerEventName>(name: T, detail: PlayerEventMap[T]) => {
    for (const listener of Array.from(listeners.get(name) ?? [])) {
      listener({ detail });
    }
  };

  const readFrame = () => (player ? secondsToFrame(player.currentTime, fps) : frame);

  const syncFrame = () => {
    const next = readFrame();
    if (next !== frame) {
      frame = next;
      emit("frameupdate", { frame });
    }
  };

  // `timeupdate` is ~10 fps; while playing, sample `currentTime` every animation frame.
  const tick = () => {
    rafId = null;
    syncFrame();
    if (player && !player.paused) {
      rafId = scheduler.request(tick);
    }
  };

  const stopTicking = () => {
    if (rafId !== null) {
      scheduler.cancel(rafId);
      rafId = null;
    }
  };

  const onPlay = () => {
    emit("play", undefined);
    if (rafId === null) {
      rafId = scheduler.request(tick);
    }
  };
  const onPause = () => {
    stopTicking();
    syncFrame();
    emit("pause", undefined);
  };
  const onEnded = () => {
    stopTicking();
    syncFrame();
    emit("ended", undefined);
  };
  // A reload (duration change) starts the new document at 0: keep the playhead where it was.
  const onReady = () => {
    if (!player) {
      return;
    }
    player.volume = volume;
    const maxFrame = Math.max(0, secondsToFrame(player.duration, fps) - 1);
    const target = Math.min(frame, maxFrame);
    // `currentTime` still holds the old value here, but the new runtime starts at 0.
    if (target > 0) {
      player.seek(frameToSeconds(target, fps));
    }
    syncFrame();
  };

  const playerEvents: Array<[string, () => void]> = [
    ["play", onPlay],
    ["pause", onPause],
    ["ended", onEnded],
    ["timeupdate", syncFrame],
    ["ready", onReady],
  ];

  return {
    addEventListener: (name, callback) => {
      let set = listeners.get(name);
      if (!set) {
        set = new Set();
        listeners.set(name, set);
      }
      set.add(callback as PlayerListener<PlayerEventName>);
    },
    removeEventListener: (name, callback) => {
      listeners.get(name)?.delete(callback as PlayerListener<PlayerEventName>);
    },
    getCurrentFrame: readFrame,
    getVolume: () => volume,
    isPlaying: () => (player ? !player.paused : false),
    pause: () => {
      player?.pause();
    },
    play: () => {
      player?.play();
    },
    seekTo: (target) => {
      if (!player) {
        return;
      }
      // The player's seek() parks playback without a `pause` event; the adapter keeps playing.
      const wasPlaying = !player.paused;
      player.seek(frameToSeconds(target, fps));
      frame = readFrame();
      emit("seeked", { frame });
      if (wasPlaying) {
        player.play();
      }
    },
    setPlayerRef: (next) => {
      if (next === player) {
        return;
      }
      stopTicking();
      for (const [type, listener] of playerEvents) {
        player?.removeEventListener(type, listener);
      }
      player = next;
      if (!next) {
        return;
      }
      for (const [type, listener] of playerEvents) {
        next.addEventListener(type, listener);
      }
      next.volume = volume;
      syncFrame();
    },
    setVolume: (next) => {
      volume = Math.min(Math.max(next, 0), 1);
      if (player) {
        player.volume = volume;
      }
      emit("volumechange", { volume });
    },
    toggle: () => {
      if (!player) {
        return;
      }
      if (player.paused) {
        player.play();
      } else {
        player.pause();
      }
    },
  };
}

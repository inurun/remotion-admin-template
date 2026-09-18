import type { CallbackListener, EventTypes, PlayerRef } from "@remotion/player";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type PlayerEventCallback = CallbackListener<EventTypes>;

type RemotionPlayerControlContextValue = {
  addEventListener: <T extends EventTypes>(name: T, callback: CallbackListener<T>) => void;
  getCurrentFrame: () => number;
  getVolume: () => number;
  isPlaying: () => boolean;
  pause: () => void;
  play: () => void;
  removeEventListener: <T extends EventTypes>(name: T, callback: CallbackListener<T>) => void;
  seekTo: (frame: number) => void;
  setPlayerRef: (player: PlayerRef | null) => void;
  setVolume: (volume: number) => void;
  toggle: () => void;
};

const RemotionPlayerControlContext = createContext<RemotionPlayerControlContextValue | null>(null);

export function RemotionPlayerControlProvider({ children }: { children: React.ReactNode }) {
  const playerRef = useRef<PlayerRef | null>(null);
  const [playerGeneration, setPlayerGeneration] = useState(0);

  const setPlayerRef = useCallback((player: PlayerRef | null) => {
    if (playerRef.current === player) {
      return;
    }

    playerRef.current = player;
    setPlayerGeneration((generation) => generation + 1);
  }, []);

  const value = useMemo<RemotionPlayerControlContextValue>(() => {
    void playerGeneration;

    return {
      addEventListener: (name, callback) => {
        playerRef.current?.addEventListener(name, callback as PlayerEventCallback);
      },
      getCurrentFrame: () => playerRef.current?.getCurrentFrame() ?? 0,
      getVolume: () => playerRef.current?.getVolume() ?? 1,
      isPlaying: () => playerRef.current?.isPlaying() ?? false,
      pause: () => {
        playerRef.current?.pause();
      },
      play: () => {
        playerRef.current?.play();
      },
      removeEventListener: (name, callback) => {
        playerRef.current?.removeEventListener(name, callback as PlayerEventCallback);
      },
      seekTo: (frame) => {
        playerRef.current?.seekTo(frame);
      },
      setPlayerRef,
      setVolume: (volume) => {
        playerRef.current?.setVolume(volume);
      },
      toggle: () => {
        playerRef.current?.toggle();
      },
    };
  }, [playerGeneration, setPlayerRef]);

  return (
    <RemotionPlayerControlContext.Provider value={value}>
      {children}
    </RemotionPlayerControlContext.Provider>
  );
}

export function useRemotionPlayerControl() {
  const context = useContext(RemotionPlayerControlContext);
  if (!context) {
    throw new Error("RemotionPlayerControlContext is missing");
  }

  return context;
}

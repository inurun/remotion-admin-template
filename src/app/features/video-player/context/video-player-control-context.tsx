import { createContext, useContext, useState } from "react";
import { VIDEO_FPS } from "@/constants";
import {
  createPlayerAdapter,
  type PlayerAdapter,
} from "@/app/features/video-player/lib/player-adapter";

type VideoPlayerControlContextValue = PlayerAdapter;

const VideoPlayerControlContext = createContext<VideoPlayerControlContextValue | null>(null);

export function VideoPlayerControlProvider({ children }: { children: React.ReactNode }) {
  const [adapter] = useState(() => createPlayerAdapter({ fps: VIDEO_FPS }));

  return (
    <VideoPlayerControlContext.Provider value={adapter}>
      {children}
    </VideoPlayerControlContext.Provider>
  );
}

export function useVideoPlayerControl() {
  const context = useContext(VideoPlayerControlContext);
  if (!context) {
    throw new Error("VideoPlayerControlContext is missing");
  }

  return context;
}

import type { VideoDefinition } from "@/video-host/contract";
import { audioConfig } from "./config";
import { Composition } from "./core/composition";

/** The only import `src/video-host` makes from the composition. */
export const video: VideoDefinition = { ...audioConfig, Composition };

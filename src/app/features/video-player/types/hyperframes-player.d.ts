import type { HyperframesPlayer } from "@hyperframes/player";
import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "hyperframes-player": DetailedHTMLProps<
        HTMLAttributes<HyperframesPlayer>,
        HyperframesPlayer
      > & {
        src?: string;
        "playback-rate"?: string;
        "disable-click-to-play"?: string;
      };
    }
  }
}

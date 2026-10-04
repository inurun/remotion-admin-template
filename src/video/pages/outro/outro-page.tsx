/** @jsxImportSource @inurun/vite-plugin-hyperframes-jsx */
import { OutroPageContextProvider, OutroPageProps } from "./context";
import { BackgroundLayer } from "./layer-background/layer-background";
import { TtsLayer } from "./layer-tts/layer-tts";

export function OutroPage(props: OutroPageProps) {
  return (
    <OutroPageContextProvider {...props}>
      <BackgroundLayer />
      <TtsLayer />
    </OutroPageContextProvider>
  );
}

import { IntroPageContextProvider, IntroPageProps } from "./context";
import { BackgroundLayer } from "./layer-background/layer-background";
import { TtsLayer } from "./layer-tts/layer-tts";

export function IntroPage(props: IntroPageProps) {
  return (
    <IntroPageContextProvider {...props}>
      <BackgroundLayer />
      <TtsLayer />
    </IntroPageContextProvider>
  );
}

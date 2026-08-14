import { MainPageContextProvider, MainPageProps } from "./context";
import { BackgroundLayer } from "./layer-background/layer-background";
import { TtsLayer } from "./layer-tts/layer-tts";

export function MainPage(props: MainPageProps) {
  return (
    <MainPageContextProvider {...props}>
      <BackgroundLayer />
      <TtsLayer />
    </MainPageContextProvider>
  );
}

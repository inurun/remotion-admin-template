import type { SavedPage, SavedProject } from "@/_schemas";
import { isSavedContentPage, isSavedTransition } from "@/_schemas";
import { ProjectProvider } from "./context";
import { BgmLayer } from "../layers/layer-bgm/layer-bgm";
import { IntroPage } from "../pages/intro/intro-page";
import { MainPage } from "../pages/main/main-page";
import { OutroPage } from "../pages/outro/outro-page";
import { getTransitionPresentation } from "../transitions/registry";
import { getTransitionDurationSec, getTransitionEasing } from "../transitions/variants";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { secondsToFrames } from "../utils/timing";

function PageByType({ page }: { page: SavedPage }) {
  switch (page.type) {
    case "intro":
      return <IntroPage page={page} />;
    case "main":
      return <MainPage page={page} />;
    case "outro":
      return <OutroPage page={page} />;
    case "endcard":
      return null;
  }
}

export function Composition({ project }: { project: SavedProject }) {
  return (
    <ProjectProvider value={project}>
      <BgmLayer />
      <TransitionSeries name="project">
        {project.pages.map((item, index) => {
          if (isSavedTransition(item)) {
            const durationInFrames = Math.max(
              1,
              secondsToFrames(getTransitionDurationSec(item.variant)),
            );
            return (
              <TransitionSeries.Transition
                key={item.id}
                timing={linearTiming({
                  durationInFrames,
                  easing: getTransitionEasing(item.variant),
                })}
                presentation={getTransitionPresentation(item.variant)}
              />
            );
          }

          if (!isSavedContentPage(item)) {
            return null;
          }

          return (
            <TransitionSeries.Sequence
              key={item.id}
              durationInFrames={Math.max(1, secondsToFrames(item.durationSec))}
              name={`${item.type}-page-${String(index).padStart(2, "0")}`}
            >
              <PageByType page={item} />
            </TransitionSeries.Sequence>
          );
        })}
      </TransitionSeries>
    </ProjectProvider>
  );
}

import { SEQUENCE_TRACK_ID, type SavedPage } from "@/_schemas";
import { ProjectProvider, type RemotionCompositionProps } from "./context";
import { BgmLayer } from "../layers/layer-bgm/layer-bgm";
import { IntroPage } from "../pages/intro/intro-page";
import { MainPage } from "../pages/main/main-page";
import { OutroPage } from "../pages/outro/outro-page";
import { CommentsPage } from "../pages/comments/comments-page";
import { getTransitionPresentation } from "../transitions/registry";
import { getTransitionEasing } from "../transitions/variants";
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
    case "comments":
      return <CommentsPage page={page} />;
    case "endcard":
    case "eyecatch-text":
      return null;
  }
}

export function Composition(props: RemotionCompositionProps) {
  const { project, timeline } = props;
  const timings = new Map(
    (timeline.tracks.find((track) => track.id === SEQUENCE_TRACK_ID)?.clips ?? []).map((clip) => [
      clip.id,
      clip,
    ]),
  );

  return (
    <ProjectProvider value={props}>
      <BgmLayer />
      <TransitionSeries name="project">
        {project.pages.map((item, index) => {
          const timing = timings.get(item.id);
          const durationInFrames = Math.max(1, secondsToFrames(timing?.durationSec ?? 0));

          if (item.type === "transition") {
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

          return (
            <TransitionSeries.Sequence
              key={item.id}
              durationInFrames={durationInFrames}
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

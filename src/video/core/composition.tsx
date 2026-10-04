/** @jsxImportSource @inurun/vite-plugin-hyperframes-jsx */
import type { SavedPage } from "@/_schemas";
import { linearTiming, TransitionSeries } from "@inurun/vite-plugin-hyperframes-jsx/runtime";
import type { HfData } from "@/video-host/contract";
import { secondsRangeToFrames } from "@/video-host/frame-utils";
import { getSequenceClips } from "@/video-host/sequence-clips";
import { ProjectProvider } from "./context";
import { IntroPage } from "../pages/intro/intro-page";
import { MainPage } from "../pages/main/main-page";
import { OutroPage } from "../pages/outro/outro-page";
import { CommentsPage } from "../pages/comments/comments-page";
import { getTransitionPresentation } from "../transitions/registry";
import { getTransitionEasing } from "../transitions/variants";

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

export function Composition(props: HfData) {
  const { project, timeline } = props;
  const timings = new Map(getSequenceClips(timeline).map((clip) => [clip.id, clip]));

  return (
    <ProjectProvider value={props}>
      <TransitionSeries>
        {project.pages.map((item) => {
          const timing = timings.get(item.id);
          const durationInFrames = secondsRangeToFrames(
            timing?.startSec ?? 0,
            timing?.durationSec ?? 0,
          ).duration;

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
            <TransitionSeries.Sequence key={item.id} durationInFrames={durationInFrames}>
              <PageByType page={item} />
            </TransitionSeries.Sequence>
          );
        })}
      </TransitionSeries>
    </ProjectProvider>
  );
}

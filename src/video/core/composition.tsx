/** @jsxImportSource @inurun/vite-plugin-hyperframes-jsx */
import type { SavedPage } from "@/_schemas";
import { Clip } from "@inurun/vite-plugin-hyperframes-jsx/runtime";
import type { HfData } from "@/video-host/contract";
import { getSequenceClips } from "@/video-host/sequence-clips";
import { CompositionTimeline } from "@/video/lib/timeline";
import { Transition } from "@/video/lib/transition";
import { ProjectProvider } from "./context";
import { IntroPage } from "../pages/intro/intro-page";
import { MainPage } from "../pages/main/main-page";
import { OutroPage } from "../pages/outro/outro-page";
import { CommentsPage } from "../pages/comments/comments-page";
import { getTransitionAnimation } from "../transitions/registry";

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
      <CompositionTimeline>
        {project.pages.map((item, index) => {
          // The timeline already places every page and transition, in absolute seconds.
          const timing = timings.get(item.id);
          if (!timing) {
            return null;
          }

          if (item.type === "transition") {
            const from = project.pages[index - 1];
            const to = project.pages[index + 1];
            return from && to ? (
              <Transition
                from={from.id}
                to={to.id}
                start={timing.startSec}
                duration={timing.durationSec}
                animation={getTransitionAnimation(item.variant)}
              />
            ) : null;
          }

          return (
            <Clip start={timing.startSec} duration={timing.durationSec}>
              <div data-scene={item.id} className="absolute inset-0">
                <PageByType page={item} />
              </div>
            </Clip>
          );
        })}
      </CompositionTimeline>
    </ProjectProvider>
  );
}

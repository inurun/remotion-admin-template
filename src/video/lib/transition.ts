import { onMounted } from "@inurun/vite-plugin-hyperframes-jsx/runtime";
import { useCompositionScope } from "./timeline";

/** Adds the tweens of a transition to `tl`, running from `at` for `duration` seconds. */
export type TransitionAnimation = (
  tl: gsap.core.Timeline,
  targets: { exiting: HTMLElement; entering: HTMLElement },
  at: number,
  duration: number,
) => void;

/**
 * Animates the overlap of two scenes: the elements marked `data-scene="<from>"` and
 * `data-scene="<to>"`, from `start` (absolute seconds) for `duration`.
 */
export function Transition(props: {
  from: string;
  to: string;
  start: number;
  duration: number;
  animation: TransitionAnimation;
}) {
  const { timeline, query } = useCompositionScope();
  onMounted(() => {
    const [exiting] = query(`[data-scene="${CSS.escape(props.from)}"]`);
    const [entering] = query(`[data-scene="${CSS.escape(props.to)}"]`);
    if (exiting && entering) {
      props.animation(timeline, { exiting, entering }, props.start, props.duration);
    }
  });
  return null;
}

/** @jsxImportSource @inurun/vite-plugin-hyperframes-jsx */
import { gsap } from "gsap";
import {
  createContext,
  defineMount,
  getClipTiming,
  getVideoConfig,
  mount,
  onMounted,
  readContext,
  type HfNode,
  type MountContext,
} from "@inurun/vite-plugin-hyperframes-jsx/runtime";
import { HF_COMPOSITION_ID } from "@/video-host/constants";

/** Elements matching `selector` among some mounted nodes (the nodes themselves included). */
type Query = (selector: string) => HTMLElement[];

type Scope = { timeline: gsap.core.Timeline; query: Query };

const ScopeContext = createContext<Scope | null>(null);

/** Mounts `node` into `ctx` and returns a query over the top-level nodes it created. */
function mountScoped(node: HfNode, ctx: MountContext): Query {
  const before = ctx.parent.lastChild;
  mount(node, ctx);
  const nodes: Element[] = [];
  for (let child = before ? before.nextSibling : ctx.parent.firstChild; child; ) {
    if (child instanceof Element) {
      nodes.push(child);
    }
    child = child.nextSibling;
  }
  return (selector) =>
    nodes.flatMap((el) => [
      ...(el.matches(selector) ? [el as HTMLElement] : []),
      ...el.querySelectorAll<HTMLElement>(selector),
    ]);
}

/**
 * One paused GSAP timeline per mount, registered for HyperFrames to seek. A new mount (new
 * preview data) registers a new one, which HyperFrames rebinds once the data is applied.
 */
export const CompositionTimeline = defineMount<{ children?: HfNode }>(({ children }, ctx) => {
  const timeline = gsap.timeline({ paused: true });
  // As long as the composition, whatever the last tween.
  timeline.set({}, {}, getVideoConfig().duration);
  // The nodes exist only after the mount below; the query reads them when it is called.
  let query: Query = () => [];
  const scope: Scope = { timeline, query: (selector) => query(selector) };
  onMounted(() => {
    // Only the registry: assigning `window.gsap` would let HyperFrames' render shim wrap
    // `gsap.timeline()` in a deferred proxy, which `timeline.add()` cannot take.
    const hfWindow = window as unknown as { __timelines?: Record<string, unknown> };
    (hfWindow.__timelines ??= {})[HF_COMPOSITION_ID] = timeline;
  });
  query = mountScoped(<ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>, ctx);
});

/** The composition timeline and a query over the composition's elements. */
export function useCompositionScope(): Scope {
  const scope = readContext(ScopeContext);
  if (!scope) {
    throw new Error("useCompositionScope must be used within CompositionTimeline.");
  }
  return scope;
}

/**
 * Animates its children with GSAP on the enclosing clip's clock: position 0 of `tl` is when
 * the clip starts. `q` finds elements among the children. `animate` runs once, after the
 * mount (layout and fonts ready). Adds no element of its own.
 */
export const Timeline = defineMount<{
  animate: (tl: gsap.core.Timeline, q: Query) => void;
  children?: HfNode;
}>(({ animate, children }, ctx) => {
  const { timeline } = useCompositionScope();
  const { start } = getClipTiming();
  const q = mountScoped(children, ctx);
  onMounted(() => {
    const tl = gsap.timeline();
    animate(tl, q);
    timeline.add(tl, start);
  });
});

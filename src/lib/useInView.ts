import { useEffect, useRef, useState, type RefObject } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Fires when 15% of the block is inside the viewport. */
const DEFAULT_THRESHOLD = 0.15;

/** Holds the trigger until the block is ~10% into the viewport, so the entrance
    plays where the reader can see it instead of at the very edge of the screen. */
const DEFAULT_ROOT_MARGIN = "0px 0px -10% 0px";

export type UseInViewOptions = {
  /** IntersectionObserver threshold; 15% by default. */
  threshold?: number;
  /** Keep the revealed state after the first intersection instead of toggling it.
      Default false: the entrance replays every time the block re-enters the viewport. */
  once?: boolean;
  /** Observer root margin; pulls the trigger 10% into the viewport by default. */
  rootMargin?: string;
  /** Observe the nearest ancestor that carries no `.motion-clip` instead of the element. */
  observeUnclippedAncestor?: boolean;
};

/**
 * The element itself, or — for a `.motion-clip` slot — the block around it. A slot held at
 * `inset(0 100% 0 0)` is clipped to zero area, so the observer reads intersectionRatio 0
 * however far the page is scrolled and the threshold is never met: the trigger has to come
 * from the nearest ancestor the mask does not zero out.
 */
function observerTarget(element: HTMLElement, observeUnclippedAncestor: boolean): Element {
  if (!observeUnclippedAncestor) {
    return element;
  }
  let node: HTMLElement | null = element.parentElement;
  while (node && node.classList.contains("motion-clip")) {
    node = node.parentElement;
  }
  return node ?? element;
}

/** True when this environment must never animate: SSR, no IntersectionObserver, reduced motion. */
function shouldSkipObserver(): boolean {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
    return true;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Observes an element and reports whether it has entered the viewport.
 *
 * The element carries the class itself (`is-in` on the node) rather than the state living
 * only in React: an observer that re-subscribes on every render can miss the entry it was
 * created for, and a replay needs the leave and the re-entry to be seen by one observer.
 * State is kept only so callers can re-render on demand.
 */
export function useInView<T extends HTMLElement>(
  options: UseInViewOptions = {},
): [RefObject<T | null>, boolean] {
  const {
    threshold = DEFAULT_THRESHOLD,
    once = false,
    rootMargin = DEFAULT_ROOT_MARGIN,
    observeUnclippedAncestor = false,
  } = options;
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    if (shouldSkipObserver()) {
      setInView(true);
      return;
    }

    const target = observerTarget(element, observeUnclippedAncestor);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) {
              observer.disconnect();
            }
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [observeUnclippedAncestor, once, rootMargin, threshold]);

  return [ref, inView];
}

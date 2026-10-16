import { useEffect, useRef, useState, type RefObject } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Fires once 15% of the block is inside the viewport. */
const DEFAULT_THRESHOLD = 0.15;

/** Holds the trigger until the block is ~10% into the viewport, so the entrance
    plays where the reader can see it instead of at the very edge of the screen. */
const DEFAULT_ROOT_MARGIN = "0px 0px -10% 0px";

export type UseInViewOptions = {
  /** IntersectionObserver threshold; 15% by default. */
  threshold?: number;
  /** Keep the revealed state after the first intersection instead of toggling it. */
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
  let node = element.parentElement;
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
 * Returns inView === true immediately (no observer) when the environment has no
 * IntersectionObserver or the user prefers reduced motion, so content is never
 * hidden behind an animation that will not run.
 */
export function useInView<T extends HTMLElement>(
  options: UseInViewOptions = {},
): [RefObject<T | null>, boolean] {
  const {
    threshold = DEFAULT_THRESHOLD,
    once = true,
    rootMargin = DEFAULT_ROOT_MARGIN,
    observeUnclippedAncestor = false,
  } = options;
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(shouldSkipObserver);

  useEffect(() => {
    if (shouldSkipObserver()) {
      setInView(true);
      return;
    }

    const element = ref.current;
    if (!element) {
      return;
    }

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

    observer.observe(observerTarget(element, observeUnclippedAncestor));
    return () => observer.disconnect();
  }, [observeUnclippedAncestor, once, rootMargin, threshold]);

  return [ref, inView];
}

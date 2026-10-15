import { useEffect, useRef, useState, type RefObject } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export type UseInViewOptions = {
  /** IntersectionObserver threshold; the observer fires at 15% visibility by default. */
  threshold?: number;
  /** Keep the revealed state after the first intersection instead of toggling it. */
  once?: boolean;
  rootMargin?: string;
};

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
  const { threshold = 0.15, once = true, rootMargin } = options;
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

    observer.observe(element);
    return () => observer.disconnect();
  }, [once, rootMargin, threshold]);

  return [ref, inView];
}

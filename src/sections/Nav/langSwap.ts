/* Language-switch FLIP (BLUEPRINT §4 #6, motion spec §5): the switch measures the surfaces
   that carry the language, commits the change, inverts the movement as a transform on the
   first frame and releases it, so `--dur-1` / `--ease-out` (declared in Nav.css) carries each
   element home. One group at a time; under `prefers-reduced-motion: reduce` the switch is
   instant and no FLIP runs. No inline transition is ever written — only the per-element
   transform, which is what the measured deltas are. */

import { flushSync } from "react-dom";

/** The language-carrying text: the nav brand and its four labels, and the hero title
    (Hero.tsx owns that element; the switch that drives the reflow lives here). */
const FLIP_TARGETS = "#nav .nav__name, #nav .nav__links .nav__label, #hero-title";

/** The release transition, declared in Nav.css beside the switch that uses it. */
const FLIP_CLASS = "is-lang-flip";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

type Position = { element: HTMLElement; x: number; y: number };

/** Rects of the flip targets in document order, so before and after line up by index. */
function positions(): Position[] {
  return [...document.querySelectorAll<HTMLElement>(FLIP_TARGETS)].map((element) => {
    const rect = element.getBoundingClientRect();
    return { element, x: rect.left, y: rect.top };
  });
}

let group: { frame: number; elements: HTMLElement[] } | null = null;

/** Drop the group in flight; a second switch also drops it, so at most one group runs. */
function clear(): void {
  if (group === null) {
    return;
  }
  cancelAnimationFrame(group.frame);
  for (const element of group.elements) {
    element.style.transform = "";
    element.classList.remove(FLIP_CLASS);
  }
  group = null;
}

/** Commit a language switch and smooth the reflow behind it. */
export function swapLanguage(commit: () => void): void {
  clear();
  if (typeof window === "undefined" || window.matchMedia(REDUCED_MOTION).matches) {
    commit();
    return;
  }

  const before = positions();
  /* `setLang` notifies a `useSyncExternalStore` subscriber, so the re-render it schedules has
     to be flushed here for the second measurement to be the real post-switch layout. */
  flushSync(commit);
  const after = positions();

  const elements: HTMLElement[] = [];
  before.forEach((from, index) => {
    const to = after[index];
    if (to === undefined || (from.x === to.x && from.y === to.y)) {
      return;
    }
    to.element.style.transform = `translate(${from.x - to.x}px, ${from.y - to.y}px)`;
    elements.push(to.element);
  });
  if (elements.length === 0) {
    return;
  }

  /* One style flush between the inverted start state and the transition, so the browser has a
     value to interpolate instead of animating the inversion itself. */
  void document.body.offsetHeight;
  for (const element of elements) {
    element.classList.add(FLIP_CLASS);
  }
  group = {
    frame: requestAnimationFrame(() => {
      for (const element of elements) {
        element.style.transform = "";
      }
    }),
    elements,
  };
}

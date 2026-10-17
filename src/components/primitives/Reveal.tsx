import type { ElementType, JSX, ReactNode } from "react";
import { useInView } from "../../lib/useInView";

type RevealTag = keyof JSX.IntrinsicElements;

export type RevealProps = {
  as?: RevealTag;
  /** Stagger tier; each tier maps to its own --reveal-delay token (motion.css). */
  delay?: 0 | 1 | 2 | 3;
  /** Observer threshold; the useInView default (15%) unless a block needs another. */
  threshold?: number;
  /** Observer root margin; the useInView default (-10% at the bottom) unless a block needs another. */
  rootMargin?: string;
  /** Play only on the first entrance (chrome that must not flicker: nav, hero, photo band). */
  once?: boolean;
  /** Extra motion hooks travel here too: `motion-slide`, `motion-clip`, `motion-hover`. */
  className?: string;
  children?: ReactNode;
};

/**
 * Fades and lifts its children in every time the block scrolls into view. Chrome passes
 * `once` so it settles after its first entrance.
 *
 * A `.motion-clip` slot is the one exception: its mask holds the box at zero area, so the
 * observer can only ever fire once — replaying it would leave the slot clipped shut. The
 * mask therefore keeps its single sweep while everything else replays.
 */
export function Reveal({
  as = "div",
  delay = 0,
  threshold,
  rootMargin,
  once,
  className,
  children,
}: RevealProps): JSX.Element {
  const isClip = (className ?? "").split(/\s+/).includes("motion-clip");
  const [ref, inView] = useInView<HTMLElement>({
    threshold,
    rootMargin,
    once: isClip ? true : once,
    observeUnclippedAncestor: isClip,
  });
  const classes = ["reveal", inView ? "is-in" : null, className].filter(Boolean).join(" ");
  // JSX cannot tie a ref to the chosen tag of a union, so the tag is widened here.
  const Element = as as ElementType;

  return (
    <Element ref={ref} className={classes} data-delay={delay}>
      {children}
    </Element>
  );
}

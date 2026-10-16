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
  /** Extra motion hooks travel here too: `motion-slide`, `motion-clip`, `motion-hover`. */
  className?: string;
  children?: ReactNode;
};

/**
 * Fades and lifts its children in once the block scrolls into view. The classes come
 * from motion.css, so a caller can add one of the other hooks by name.
 */
export function Reveal({
  as = "div",
  delay = 0,
  threshold,
  rootMargin,
  className,
  children,
}: RevealProps): JSX.Element {
  // A `.motion-clip` slot is clipped to zero area, so it can never trip its own observer:
  // the trigger is read from the block around it. Callers ask for the mask by name only.
  const observeUnclippedAncestor = (className ?? "").split(/\s+/).includes("motion-clip");
  const [ref, inView] = useInView<HTMLElement>({ threshold, rootMargin, observeUnclippedAncestor });
  const classes = ["reveal", inView ? "is-in" : null, className].filter(Boolean).join(" ");
  // JSX cannot tie a ref to the chosen tag of a union, so the tag is widened here.
  const Element = as as ElementType;

  return (
    <Element ref={ref} className={classes} data-delay={delay}>
      {children}
    </Element>
  );
}

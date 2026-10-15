import type { ElementType, JSX, ReactNode } from "react";
import { useInView } from "../../lib/useInView";

type RevealTag = keyof JSX.IntrinsicElements;

export type RevealProps = {
  as?: RevealTag;
  /** Stagger tier; each tier maps to its own --reveal-delay token. */
  delay?: 0 | 1 | 2 | 3;
  className?: string;
  children?: ReactNode;
};

/** Fades and lifts its children in once the block scrolls into view. */
export function Reveal({ as = "div", delay = 0, className, children }: RevealProps): JSX.Element {
  const [ref, inView] = useInView<HTMLElement>();
  const classes = ["reveal", inView ? "is-in" : null, className].filter(Boolean).join(" ");
  // JSX cannot tie a ref to the chosen tag of a union, so the tag is widened here.
  const Element = as as ElementType;

  return (
    <Element ref={ref} className={classes} data-delay={delay}>
      {children}
    </Element>
  );
}

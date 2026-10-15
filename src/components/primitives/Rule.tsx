/** Rule weights from the design brief: hairline, page baseline, section baseline. */
export type RuleVariant = "hairline" | "page" | "baseline";

type RuleProps = {
  variant?: RuleVariant;
};

/** Horizontal rule; the stroke values live in primitives.css, not at call sites. */
export function Rule({ variant = "hairline" }: RuleProps) {
  return <hr data-rule={variant} />;
}

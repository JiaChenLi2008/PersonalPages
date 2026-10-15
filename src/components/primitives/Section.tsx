import type { ReactNode } from "react";

type SectionTag = "section" | "header" | "footer" | "aside";

type SectionProps = {
  /** Short kebab-case page-section name, rendered as data-section. */
  name: string;
  as?: SectionTag;
  children?: ReactNode;
};

/** Page-section landmark: the only place that stamps data-section on the page. */
export function Section({ name, as: Tag = "section", children }: SectionProps) {
  return <Tag data-section={name}>{children}</Tag>;
}

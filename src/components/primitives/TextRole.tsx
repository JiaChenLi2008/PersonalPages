import type { ReactNode } from "react";

/**
 * Text node names from the design brief; the same name always means the same
 * type spec, so a role is never invented per section.
 * Name/CN/N/L/Mail = nav and footer slots, K/V = key-value rows,
 * H1/H1cn = hero, T/EN/D = section titles, No/E/C/R = index rows.
 */
export type TextRoleName =
  | "Name"
  | "CN"
  | "N"
  | "L"
  | "Mail"
  | "K"
  | "V"
  | "H1"
  | "H1cn"
  | "T"
  | "EN"
  | "D"
  | "No"
  | "E"
  | "C"
  | "R";

type TextRoleTag =
  | "span"
  | "div"
  | "p"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "li"
  | "dl"
  | "dt"
  | "dd"
  | "figcaption"
  | "strong";

type TextRoleProps = {
  role: TextRoleName;
  as?: TextRoleTag;
  className?: string;
  children?: ReactNode;
};

/** Marks a text node with its design-brief role; the visual spec lands with the section lanes. */
export function TextRole({ role, as: Tag = "span", className, children }: TextRoleProps) {
  return (
    <Tag className={className} data-role={role}>
      {children}
    </Tag>
  );
}

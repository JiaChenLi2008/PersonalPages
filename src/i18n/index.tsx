/* Legacy spelling of the page language. The state itself lives in lang.ts; this façade
   exists because the sections written before it (PhotoBand / Method / Values) and the
   read-only SSR check (tools/verify-ssr-dom.mjs, which imports LocaleProvider) reach for
   the two-letter `Locale`. Nothing here holds copy or state of its own. */

import type { ReactNode } from "react";
import { useLang, type Lang } from "./lang";

export type Locale = "en" | "zh";

const LOCALE_OF: Record<Lang, Locale> = { en: "en", "zh-Hans": "zh" };

/** Kept for the call sites that still wrap with it: the language needs no provider. */
export function LocaleProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useLocale(): { locale: Locale } {
  const { lang } = useLang();
  return { locale: LOCALE_OF[lang] };
}

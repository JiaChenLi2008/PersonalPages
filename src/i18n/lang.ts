/* Page language: `?lang=` wins over the stored choice, which wins over zh-Hans.
   The dictionaries keep the two-letter file index (`en` / `zh`); `Lang` is the value
   `<html lang>` and every element-level `lang` attribute must carry (BLUEPRINT §6.4).
   Switching is page-internal: no reload, no navigation (BLUEPRINT §6.6 #6). */

import { useSyncExternalStore } from "react";
import enCopy from "../../docs/copy-en.json";
import zhCopy from "../../docs/copy-zh.json";

export type Lang = "en" | "zh-Hans";

/** The frozen design (ui.pen) is the Chinese page, so it is the default. */
export const DEFAULT_LANG: Lang = "zh-Hans";

/** Dictionary file index for a page language. */
export const DICTIONARY_OF: Record<Lang, "en" | "zh"> = { en: "en", "zh-Hans": "zh" };

const STORAGE_KEY = "jc-lang";
const QUERY_KEY = "lang";

/** Hero main title per mode; the newline is normalised to a space (BLUEPRINT §5). */
const TITLE_KEY: Record<Lang, "hero.h1cn" | "hero.h1"> = {
  "zh-Hans": "hero.h1cn",
  en: "hero.h1",
};

const DICTIONARIES = { en: enCopy, zh: zhCopy };

function parseLang(value: string | null): Lang | null {
  return value === "en" || value === "zh-Hans" ? value : null;
}

function storedLang(): Lang | null {
  try {
    return parseLang(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Storage can be unavailable (private mode): the default language stands.
    return null;
  }
}

/** Resolution order: `?lang=` → localStorage → default. */
function resolveLang(): Lang {
  if (typeof window === "undefined") {
    return DEFAULT_LANG;
  }
  const fromQuery = parseLang(new URLSearchParams(window.location.search).get(QUERY_KEY));
  return fromQuery ?? storedLang() ?? DEFAULT_LANG;
}

/** The mode's own Hero title, taken verbatim from the dictionary. */
function titleOf(lang: Lang): string {
  return DICTIONARIES[DICTIONARY_OF[lang]][TITLE_KEY[lang]].text.replace(/\s*\n\s*/g, " ");
}

let current: Lang = resolveLang();
const listeners = new Set<() => void>();

function apply(lang: Lang): void {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.lang = lang;
  document.title = titleOf(lang);
}

apply(current);

export function getLang(): Lang {
  return current;
}

export function subscribeLang(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Switch the page language in place and tell every subscriber. */
export function setLang(lang: Lang): void {
  if (lang === current) {
    return;
  }
  current = lang;
  apply(lang);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Private mode: the chosen language still holds for this page view.
    }
    const url = new URL(window.location.href);
    url.searchParams.set(QUERY_KEY, lang);
    window.history.replaceState(null, "", url);
  }
  for (const listener of listeners) {
    listener();
  }
}

/** The page language and its switch. SSR renders the default mode. */
export function useLang(): { lang: Lang; setLang: (lang: Lang) => void } {
  const lang = useSyncExternalStore(subscribeLang, getLang, () => DEFAULT_LANG);
  return { lang, setLang };
}

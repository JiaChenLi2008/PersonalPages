/* Frozen copy layer: docs/copy-en.json and docs/copy-zh.json are the only source
   of visible text. Each dictionary holds its own language's text for every key, so
   the current language picks the dictionary and nothing else (BLUEPRINT §6.4: one
   language per page, no mixing). The imported objects are never rewritten at runtime. */

import en from "../../docs/copy-en.json";
import zh from "../../docs/copy-zh.json";
import { useLocale } from "./index";

export type CopyKey = keyof typeof en;

export type CopyEntry = {
  text: string;
  src?: string;
  lang: "en" | "zh-Hans";
  /** Chrome text: no material source, registered in docs/CHROME.md §1. */
  chrome?: boolean;
};

/* Section-head title pairs. Each of the three sections names the `.en` / `…En` side in its
   own JSX (`Elder.tsx` — `elder.title.en`; `Music.tsx` — `music.titleEn`; `Sport.tsx` —
   `sport.titleEn`) and the base key beside it carries the same slot's Chinese text, so the
   pair only holds together in this layer: both halves are named here, and the wiring check
   (tools/verify-copy-wiring.mjs, shape 2) sees the zh side instead of a key nothing reaches.
   The `satisfies` clause is the real work it does: a key that leaves either dictionary
   stops compiling. */
export const TITLE_PAIRS = {
  "elder.title.en": "elder.title.zh",
  "music.titleEn": "music.title",
  "sport.titleEn": "sport.title",
} as const satisfies Partial<Record<CopyKey, CopyKey>>;

/* resolveJsonModule widens every JSON string to `string`, so the two imports are
   narrowed back to the frozen shape here — the only assertion in this module. */
export const dictionaries: Record<"en" | "zh", Record<CopyKey, CopyEntry>> = {
  en: en as Record<CopyKey, CopyEntry>,
  zh: zh as Record<CopyKey, CopyEntry>,
};

type CopyApi = {
  text: (key: CopyKey) => string;
  langOf: (key: CopyKey) => string;
  entry: (key: CopyKey) => CopyEntry;
};

/** Keys already reported, so a missing entry warns once per session, not per render. */
const warnedKeys = new Set<string>();

/** Copy lookup for the current locale; a key absent from it falls back to the same key in en. */
export function useCopy(): CopyApi {
  const { locale } = useLocale();
  const dictionary: Partial<Record<CopyKey, CopyEntry>> = dictionaries[locale];

  const entry = (key: CopyKey): CopyEntry => {
    const found: CopyEntry | undefined = dictionary[key] ?? dictionaries.en[key];
    if (found !== undefined) {
      return found;
    }
    // Unreachable while docs/verify-copy.mjs keeps the two key sets equal; the raw
    // key is rendered so a hole in the dictionaries shows up as a visible defect.
    if (!warnedKeys.has(key)) {
      warnedKeys.add(key);
      console.warn(`useCopy: no copy for "${key}" in en or zh`);
    }
    return { text: key, lang: "en" };
  };

  return {
    text: (key) => entry(key).text,
    langOf: (key) => entry(key).lang,
    entry,
  };
}

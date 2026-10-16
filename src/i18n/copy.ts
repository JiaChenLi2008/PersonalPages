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

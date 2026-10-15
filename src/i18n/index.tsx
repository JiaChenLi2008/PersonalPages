/* i18n runtime: locale state only, never copy.
   Section copy lives next to its section as <name>.en.ts / <name>.zh.ts and is
   passed in by the section component; nothing in this module holds user-facing text. */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "en" | "zh";

/** localStorage key that persists the visitor's choice. */
export const LOCALE_STORAGE_KEY = "jc-locale";

/** value written to <html lang>; zh uses the Simplified Han subtag. */
const HTML_LANG: Record<Locale, string> = {
  en: "en",
  zh: "zh-Hans",
};

function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "zh";
}

/** Read the stored locale before the first render so the page never flips after paint. */
function readStoredLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(stored) ? stored : "en";
  } catch {
    return "en";
  }
}

const initialLocale: Locale = readStoredLocale();
document.documentElement.lang = HTML_LANG[initialLocale];

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.documentElement.lang = HTML_LANG[next];
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the in-memory locale still works.
    }
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (value === null) {
    throw new Error("useLocale must be used inside <LocaleProvider>");
  }
  return value;
}

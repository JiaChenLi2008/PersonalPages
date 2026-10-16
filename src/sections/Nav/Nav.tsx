import { Fragment, useEffect, useRef, useState } from "react";
import { useLang, type Lang } from "../../i18n/lang";
import { useCopy, type CopyKey } from "../../i18n/copy";
import { Reveal } from "../../components/primitives/Reveal";
import { swapLanguage } from "./langSwap";
import "./Nav.css";

/** Frozen nav order and its anchor targets (BLUEPRINT §2.2): no fifth item, no `values` entry. */
const ITEMS = [
  { id: "scholarly", no: "nav.item1.no", zh: "nav.item1.zh", en: "nav.item1.en" },
  { id: "elder", no: "nav.item2.no", zh: "nav.item2.zh", en: "nav.item2.en" },
  { id: "music", no: "nav.item3.no", zh: "nav.item3.zh", en: "nav.item3.en" },
  { id: "sport", no: "nav.item4.no", zh: "nav.item4.zh", en: "nav.item4.en" },
] as const satisfies readonly { id: string; no: CopyKey; zh: CopyKey; en: CopyKey }[];

/** ui.pen `Lang` (F2SSib) holds both options at once: 中 (left) | EN (right). */
const LANGS = [
  { lang: "zh-Hans", label: "nav.lang.zh" },
  { lang: "en", label: "nav.lang.en" },
] as const satisfies readonly { lang: Lang; label: CopyKey }[];

/** Clearance between the bar's bottom edge and a jumped-to heading (Nav.css adds the same 8px). */
const ANCHOR_GAP = 8;

/** The header's real height, as Nav.css consumes it: the bar is one row on the desktop
    but wraps below 900px, so the design token `--nav-h` only fixes the no-JS fallback. */
const NAV_H_VAR = "--nav-h-measured";

/** Site header: brand, the four numbered section links, the language toggle and the mail slot. */
export function Nav() {
  const { text, langOf } = useCopy();
  const { lang, setLang } = useLang();
  const [current, setCurrent] = useState<string | null>(null);
  const [navHeight, setNavHeight] = useState(0);
  const header = useRef<HTMLElement>(null);

  /* BLUEPRINT §6.4: a text carries `lang` only when its own language differs from the page's. */
  const copyLang = (key: CopyKey) => (langOf(key) === lang ? undefined : langOf(key));

  /* One source for both offsets: the bar's measured height feeds Nav.css's
     `scroll-padding-top` (so an anchor jump lands below the wrapped bar) and the
     scroll-spy band below. Re-measured whenever the bar changes height — a viewport
     resize, or the language switch rewrapping the labels. */
  useEffect(() => {
    const element = header.current;
    if (element === null) {
      return;
    }
    const measure = () => {
      const height = Math.round(element.getBoundingClientRect().height);
      document.documentElement.style.setProperty(NAV_H_VAR, `${height}px`);
      setNavHeight(height);
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /* Scroll spy (BLUEPRINT §4 #2): the top margin is the bar's real height, the bottom
     margin keeps the observed band one section tall. */
  useEffect(() => {
    const targets = ITEMS.map((item) => document.getElementById(item.id)).filter(
      (element): element is HTMLElement => element !== null,
    );
    if (targets.length === 0 || navHeight === 0) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setCurrent(entry.target.id);
          }
        }
      },
      { rootMargin: `-${navHeight + ANCHOR_GAP}px 0px -80% 0px` },
    );
    for (const target of targets) {
      observer.observe(target);
    }
    return () => observer.disconnect();
  }, [navHeight]);

  return (
    <header ref={header} id="nav" data-section="nav" className="nav">
      {/* Bar entrance (motion spec §2 nav, tier 0): the row lifts and fades in on first
          intersection. The hairline below stays put — it is the page rule, not the bar. */}
      <Reveal as="nav" className="nav__row" delay={0}>
        <div className="nav__brand">
          <span className="nav__mark" aria-hidden="true" />
          {/* Single-side brand (BLUEPRINT §6.4): the page renders one brand, its own
              language's key, on the main element's metrics — the pair never doubles up
              and the other key never reaches the DOM. */}
          <span
            className={lang === "zh-Hans" ? "nav__name nav__name--cn" : "nav__name"}
            lang={copyLang(lang === "zh-Hans" ? "nav.brand.cn" : "nav.brand.name")}
          >
            {lang === "zh-Hans" ? text("nav.brand.cn") : text("nav.brand.name")}
          </span>
        </div>
        <div className="nav__links">
          {ITEMS.map((item) => {
            /* The design renders one label per item, so the label follows the mode. */
            const label = lang === "zh-Hans" ? item.zh : item.en;
            return (
              <a
                key={item.id}
                className="nav__link motion-hover"
                href={`#${item.id}`}
                aria-current={current === item.id ? "true" : undefined}
              >
                <span className="nav__no" lang={copyLang(item.no)}>
                  {text(item.no)}
                </span>
                <span className="nav__label" lang={copyLang(label)}>
                  {text(label)}
                </span>
              </a>
            );
          })}
        </div>
        <div className="nav__right">
          <div className="nav__lang">
            {LANGS.map((option) => (
              <Fragment key={option.lang}>
                {option.lang === "en" && <span className="nav__lang-div" aria-hidden="true" />}
                <button
                  type="button"
                  className={`nav__lang-btn nav__lang-btn--${option.lang === "zh-Hans" ? "zh" : "en"} motion-hover`}
                  aria-pressed={option.lang === lang}
                  lang={copyLang(option.label)}
                  onClick={() => swapLanguage(() => setLang(option.lang))}
                >
                  {text(option.label)}
                </button>
              </Fragment>
            ))}
          </div>
          <span className="nav__mail" lang={copyLang("nav.mail")}>
            {text("nav.mail")}
          </span>
        </div>
      </Reveal>
      <div className="nav__rule" aria-hidden="true" />
    </header>
  );
}

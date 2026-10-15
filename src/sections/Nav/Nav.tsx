import { Fragment, useEffect, useState } from "react";
import { useLang, type Lang } from "../../i18n/lang";
import { useCopy, type CopyKey } from "../../i18n/copy";
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

/** Distance below the viewport top at which a section counts as current (BLUEPRINT §4 #2). */
const NAV_OFFSET = "80px";

/** Site header: brand, the four numbered section links, the language toggle and the mail slot. */
export function Nav() {
  const { text, langOf } = useCopy();
  const { lang, setLang } = useLang();
  const [current, setCurrent] = useState<string | null>(null);

  /* BLUEPRINT §6.4: a text carries `lang` only when its own language differs from the page's. */
  const copyLang = (key: CopyKey) => (langOf(key) === lang ? undefined : langOf(key));

  /* Scroll spy (BLUEPRINT §4 #2): the bottom margin keeps the observed band one section tall. */
  useEffect(() => {
    const targets = ITEMS.map((item) => document.getElementById(item.id)).filter(
      (element): element is HTMLElement => element !== null,
    );
    if (targets.length === 0) {
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
      { rootMargin: `-${NAV_OFFSET} 0px -80% 0px` },
    );
    for (const target of targets) {
      observer.observe(target);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <header id="nav" data-section="nav" className="nav">
      <nav className="nav__row">
        <div className="nav__brand">
          <span className="nav__mark" aria-hidden="true" />
          <span className="nav__name" lang={copyLang("nav.brand.name")}>
            {text("nav.brand.name")}
          </span>
          <span className="nav__cn" lang={copyLang("nav.brand.cn")}>
            {text("nav.brand.cn")}
          </span>
        </div>
        <div className="nav__links">
          {ITEMS.map((item) => {
            /* The design renders one label per item, so the label follows the mode. */
            const label = lang === "zh-Hans" ? item.zh : item.en;
            return (
              <a
                key={item.id}
                className="nav__link"
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
                  className={`nav__lang-btn nav__lang-btn--${option.lang === "zh-Hans" ? "zh" : "en"}`}
                  aria-pressed={option.lang === lang}
                  lang={copyLang(option.label)}
                  onClick={() => setLang(option.lang)}
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
      </nav>
      <div className="nav__rule" aria-hidden="true" />
    </header>
  );
}

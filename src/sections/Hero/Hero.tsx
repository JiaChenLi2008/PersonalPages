import { Fragment } from "react";
import { useLocale } from "../../i18n";
import { useCopy, type CopyKey } from "../../i18n/copy";
import "./Hero.css";

/** The three key-value rows of `Hero.Grid.Right`, in ui.pen order. */
const ROWS = [
  { key: "hero.key.subject", value: "hero.val.subject" },
  { key: "hero.key.instrument", value: "hero.val.instrument" },
  { key: "hero.key.sport", value: "hero.val.sport" },
] as const satisfies readonly { key: CopyKey; value: CopyKey }[];

/** Hero: the page's single h1 in the left column, key-value column and two CTAs (ui.pen ZBhBS). */
export function Hero() {
  const { text, langOf } = useCopy();
  const { locale } = useLocale();

  /* BLUEPRINT §6.4: a text carries `lang` only when its own language differs from the page's. */
  const page = locale === "zh" ? "zh-Hans" : "en";
  const copyLang = (key: CopyKey) => (langOf(key) === page ? undefined : langOf(key));

  return (
    <section id="hero" data-section="hero" className="hero" aria-labelledby="hero-title">
      <div className="hero__grid">
        <div className="hero__left">
          <p className="hero__eyebrow" lang={copyLang("hero.eyebrow")}>
            {text("hero.eyebrow")}
          </p>
          <h1 id="hero-title" className="hero__title">
            <span className="hero__title-en" lang={copyLang("hero.h1")}>
              {text("hero.h1")}
            </span>
            <span className="hero__title-cn" lang={copyLang("hero.h1cn")}>
              {text("hero.h1cn")}
            </span>
          </h1>
        </div>
        <div className="hero__right">
          <p className="hero__summary" lang={copyLang("hero.summary")}>
            {text("hero.summary")}
          </p>
          {ROWS.map((row) => (
            <Fragment key={row.key}>
              <div className="hero__rule" aria-hidden="true" />
              <div className="hero__kv">
                <span className="hero__kv-key" lang={copyLang(row.key)}>
                  {text(row.key)}
                </span>
                <span className="hero__kv-value" lang={copyLang(row.value)}>
                  {text(row.value)}
                </span>
              </div>
            </Fragment>
          ))}
          <div className="hero__rule" aria-hidden="true" />
        </div>
      </div>
      <div className="hero__btns">
        {/* The CV PDF is not in the repo yet: the button reports itself unavailable and
            stays out of the tab order until the file lands (see .agents/briefs/to-fill.md). */}
        <button
          type="button"
          className="hero__btn hero__btn--solid"
          lang={copyLang("hero.btn1")}
          aria-disabled="true"
          tabIndex={-1}
        >
          {text("hero.btn1")}
        </button>
        {/* A real mail link: the address is the dictionary's mail slot — the same entry
            the page's JSON-LD carries (BLUEPRINT §5.1). */}
        <a
          className="hero__btn hero__btn--ghost"
          href={`mailto:${text("nav.mail")}`}
          lang={copyLang("hero.btn2")}
        >
          {text("hero.btn2")}
        </a>
      </div>
    </section>
  );
}

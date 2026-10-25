import { Fragment } from "react";
import { useLocale } from "../../i18n";
import { useCopy, type CopyKey } from "../../i18n/copy";
import { Reveal } from "../../components/primitives/Reveal";
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
        {/* Entrance tiers (motion spec §2 hero): 标题 0 → 副标 1 → 键值 3. */}
        <Reveal once className="hero__left" delay={0}>
          <p className="hero__eyebrow" lang={copyLang("hero.eyebrow")}>
            {text("hero.eyebrow")}
          </p>
          <h1 id="hero-title" className="hero__title">
            {/* One title, one element (single-side rendering, BLUEPRINT §6.4): the display
                line in English, the Chinese main title in Chinese — the other side never
                reaches the DOM, and the box keeps one typography per mode. */}
            <span
              className={page === "zh-Hans" ? "hero__title-cn" : "hero__title-en"}
              lang={copyLang(page === "zh-Hans" ? "hero.h1cn" : "hero.h1")}
            >
              {page === "zh-Hans" ? text("hero.h1cn") : text("hero.h1")}
            </span>
          </h1>
        </Reveal>
        <div className="hero__right">
          <Reveal once as="p" className="hero__summary" delay={1}>
            {text("hero.summary")}
          </Reveal>
          {/* The rules travel with the key-value rows: they are one block on screen. */}
          <Reveal once className="hero__kvgroup" delay={3}>
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
          </Reveal>
        </div>
      </div>
      <div className="hero__btns">
        {/* The CV button was removed by user ruling: there is no CV PDF and no page for it to
            open, so the row now carries the one real control. The label key `hero.btn1` stays in
            both dictionaries, registered as a dead key in docs/CHROME.md §4. */}
        {/* A real mail link: the address is the dictionary's mail slot — the same entry
            the page's JSON-LD carries (BLUEPRINT §5.1). */}
        <a
          className="hero__btn hero__btn--ghost motion-hover"
          href={`mailto:${text("nav.mail")}`}
          lang={copyLang("hero.btn2")}
        >
          {text("hero.btn2")}
        </a>
      </div>
    </section>
  );
}

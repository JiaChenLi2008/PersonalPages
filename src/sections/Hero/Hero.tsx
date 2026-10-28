import { useLocale } from "../../i18n";
import { useCopy, type CopyKey } from "../../i18n/copy";
import { Reveal } from "../../components/primitives/Reveal";
import { Photo } from "../../components/Photo/Photo";
import "./Hero.css";

/** Hero: the page's single h1 in the left column, the portrait with its four intro lines on
    the right, and two CTAs (ui.pen ZBhBS). */
export function Hero() {
  const { text, langOf } = useCopy();
  const { locale } = useLocale();

  /* BLUEPRINT §6.4: a text carries `lang` only when its own language differs from the page's. */
  const page = locale === "zh" ? "zh-Hans" : "en";
  const copyLang = (key: CopyKey) => (langOf(key) === page ? undefined : langOf(key));

  return (
    <section id="hero" data-section="hero" className="hero" aria-labelledby="hero-title">
      <div className="hero__grid">
        {/* Entrance tiers (motion spec §2 hero): 标题 0 → 人像 1 → 四行 3. */}
        <Reveal once className="hero__left" delay={0}>
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
          {/* 首屏修整: the CTAs sit under the title, not on a full-width row below the grid —
              they belong to the left column's own stack. */}
          <div className="hero__btns">
            {/* The CV is the page's own file: it opens in a tab of its own, out of this document. */}
            <a
              className="hero__btn hero__btn--solid motion-hover"
              href="./media/cv.pdf"
              target="_blank"
              rel="noopener noreferrer"
              lang={copyLang("hero.btn1")}
            >
              {text("hero.btn1")}
            </a>
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
        </Reveal>
        <div className="hero__right">
          {/* docx-1028 条目3 + 车道 F 方案 A: the square portrait sits above the four intro
              lines, centred in the column. It is a decorative image — the title already names
              the person — so the box stays out of the accessibility tree and the `<img>`
              carries the empty alt. */}
          <Reveal once className="hero__portrait" delay={1}>
            <picture className="hero__portrait-media" aria-hidden="true">
              <source type="image/webp" srcSet="./media/hero-portrait-640.webp" />
              <Photo
                src="./media/hero-portrait-640.jpg"
                alt=""
                width={640}
                height={640}
                loading="lazy"
                decoding="async"
              />
            </picture>
          </Reveal>
          <Reveal once className="hero__lines motion-type" delay={3}>
            <p className="hero__line" lang={copyLang("hero.line1")}>{text("hero.line1")}</p>
            <p className="hero__line" lang={copyLang("hero.line2")}>{text("hero.line2")}</p>
            <p className="hero__line" lang={copyLang("hero.line3")}>{text("hero.line3")}</p>
            <p className="hero__line hero__line--4" lang={copyLang("hero.line4")}>{text("hero.line4")}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

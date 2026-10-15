import type { ReactNode } from "react";
import { Reveal } from "../../components/primitives/Reveal";
import { Rule } from "../../components/primitives/Rule";
import { useLocale, type Locale } from "../../i18n";
import { useCopy, type CopyKey } from "../../i18n/copy";
import "./Index.css";

/**
 * Text nodes carry data-role — the marker components/primitives/TextRole stamps —
 * on plain elements, because the same nodes must also carry the `id` (BLUEPRINT
 * §6.1) and `lang` (§6.4) attributes, which the frozen TextRole props do not accept.
 */

const PAGE_LANG: Record<Locale, string> = { en: "en", zh: "zh-Hans" };

type IndexRow = {
  no: CopyKey;
  title: CopyKey;
  titleEn: CopyKey;
  body: CopyKey;
  delay: 0 | 1 | 2 | 3;
  /** Manifest 1:1 crop for the row square; rows without one render a placeholder box. */
  image?: { src: string; srcSet: string };
};

/** The four rows in page order; index 01 is the only row with a real photograph. */
const ROWS: IndexRow[] = [
  {
    no: "index.row1.no",
    title: "index.row1.title",
    titleEn: "index.row1.titleEn",
    body: "index.row1.body",
    delay: 0,
    image: {
      src: "media/image1-1x1-1200.webp",
      srcSet: "media/image1-800.webp 1x, media/image1-1x1-1200.webp 2x",
    },
  },
  {
    no: "index.row2.no",
    title: "index.row2.title",
    titleEn: "index.row2.titleEn",
    body: "index.row2.body",
    delay: 1,
  },
  {
    no: "index.row3.no",
    title: "index.row3.title",
    titleEn: "index.row3.titleEn",
    body: "index.row3.body",
    delay: 2,
  },
  {
    no: "index.row4.no",
    title: "index.row4.title",
    titleEn: "index.row4.titleEn",
    body: "index.row4.body",
    delay: 3,
  },
];

/** Index: four numbered rows (No / T / EN / D / 1:1 square) closed by a hairline each. */
export function Index() {
  const copy = useCopy();
  const { locale } = useLocale();

  /** Dictionary text; text whose language differs from the page language keeps its own lang. */
  const t = (key: CopyKey): ReactNode => {
    const value = copy.text(key);
    const textLang = copy.langOf(key);
    return textLang === PAGE_LANG[locale] ? value : <span lang={textLang}>{value}</span>;
  };

  return (
    <section id="index" data-section="index" aria-labelledby="index-title" className="index">
      <Reveal className="index__head">
        <h2 id="index-title" className="index__eyebrow" data-role="L">
          {t("index.head.eyebrow")}
        </h2>
        <p className="index__range" data-role="R">
          {t("index.head.range")}
        </p>
      </Reveal>

      <Rule variant="baseline" />

      <ol className="index__rows" role="list">
        {ROWS.map((row) => (
          <Reveal as="li" key={row.no} delay={row.delay} className="index__row">
            <span className="index__num">
              <span data-role="No">{t(row.no)}</span>
            </span>

            <div className="index__body">
              <div className="index__top">
                <h3 className="index__title" data-role="T">
                  {t(row.title)}
                </h3>
                <p className="index__title-en" data-role="EN">
                  {t(row.titleEn)}
                </p>
              </div>
              <p className="index__d" data-role="D">
                {t(row.body)}
              </p>
            </div>

            {row.image === undefined ? (
              <div className="index__media index__media--pending" aria-hidden="true">
                <span className="index__pending">{t("scholarly.imagePending")}</span>
              </div>
            ) : (
              <img
                className="index__media"
                src={row.image.src}
                srcSet={row.image.srcSet}
                alt=""
                loading="lazy"
                decoding="async"
              />
            )}
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

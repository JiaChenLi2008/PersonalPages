import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
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
  /** The 1:1 row square (ui.pen's 148px Media box): one `src` plus its `srcSet` candidates.
      Rows 2–4 wire the MANIFEST crop of their own Media node — the webp in `srcSet`, which
      every current engine picks, and the same crop's jpg in `src` for an engine that reads
      no `srcSet`. */
  image: { src: string; srcSet: string };
};

/** The four rows in page order, each with the square ui.pen crops for its own Media node. */
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
    image: {
      src: "media/index-elder-296.jpg",
      srcSet: "media/index-elder-296.webp",
    },
  },
  {
    no: "index.row3.no",
    title: "index.row3.title",
    titleEn: "index.row3.titleEn",
    body: "index.row3.body",
    delay: 2,
    image: {
      src: "media/index-music-296.jpg",
      srcSet: "media/index-music-296.webp",
    },
  },
  {
    no: "index.row4.no",
    title: "index.row4.title",
    titleEn: "index.row4.titleEn",
    body: "index.row4.body",
    delay: 3,
    image: {
      src: "media/index-sport-296.jpg",
      srcSet: "media/index-sport-296.webp",
    },
  },
];

/** Where a flip target stood, in document space: a viewport rect would read a scroll between
    two language switches as a reflow. */
type FlipRect = { top: number; left: number };

/* motion-spec §5: the switch rewrites every row's text, so each row's text block is measured
   before the switch, pinned to where it stood with an inline transform, and released through
   the `.index__body` transition (--dur-1 / --ease-out, Index.css). Reduced motion and SSR
   skip the whole thing, and one Index owns the only group, so at most one FLIP runs at a
   time. The pin has to land before the browser paints the new text, which is a layout effect
   in the browser and the never-running `useEffect` on the server. */
const usePrePaintEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Grid of pins, one per row's text block. The class is what keeps the pin itself from
    transitioning: a pin written under the target's own transition would be interpolated. */
const PIN_CLASS = "index__body--pinned";

function useRowTextFlip(refs: RefObject<(HTMLDivElement | null)[]>, locale: Locale): void {
  const previous = useRef(new Map<HTMLElement, FlipRect>());

  usePrePaintEffect(() => {
    const elements = refs.current.filter((element): element is HTMLDivElement => element !== null);
    const measured = new Map<HTMLElement, FlipRect>();
    const moves: [element: HTMLElement, x: number, y: number][] = [];
    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      const now = { top: rect.top + window.scrollY, left: rect.left + window.scrollX };
      measured.set(element, now);
      const before = previous.current.get(element);
      if (before !== undefined && (before.top !== now.top || before.left !== now.left)) {
        moves.push([element, before.left - now.left, before.top - now.top]);
      }
    }
    previous.current = measured;
    if (moves.length === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    for (const [element, x, y] of moves) {
      element.classList.add(PIN_CLASS);
      element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
    /* One forced style flush makes the pinned transform the value the release transitions
       from; without it the browser would interpolate the pin away instead of playing it. */
    void document.documentElement.offsetHeight;
    for (const [element] of moves) {
      element.classList.remove(PIN_CLASS);
      element.style.transform = "";
    }
  }, [locale, refs]);
}

/** Index: four numbered rows (No / T / EN / D / 1:1 square) closed by a hairline each. */
export function Index() {
  const copy = useCopy();
  const { locale } = useLocale();
  const bodies = useRef<(HTMLDivElement | null)[]>([]);

  /** Dictionary text; text whose language differs from the page language keeps its own lang. */
  const t = (key: CopyKey): ReactNode => {
    const value = copy.text(key);
    const textLang = copy.langOf(key);
    return textLang === PAGE_LANG[locale] ? value : <span lang={textLang}>{value}</span>;
  };

  useRowTextFlip(bodies, locale);

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
        {ROWS.map((row, position) => (
          <Reveal as="li" key={row.no} delay={row.delay} className="index__row">
            <div className="index__row-inner motion-hover">
              <Reveal as="span" delay={row.delay} className="index__num motion-slide">
                <span data-role="No">{t(row.no)}</span>
              </Reveal>

              <div
                className="index__body"
                ref={(element) => {
                  bodies.current[position] = element;
                }}
              >
                <div className="index__top">
                  {/* One side only: the pair's other key stays out of the DOM (§6.4), and
                      the side that survives is the row's title, in the T style. */}
                  <h3 className="index__title" data-role="T">
                    {locale === "en" ? t(row.titleEn) : t(row.title)}
                  </h3>
                </div>
                <p className="index__d" data-role="D">
                  {t(row.body)}
                </p>
              </div>

              <img
                className="index__media"
                src={row.image.src}
                srcSet={row.image.srcSet}
                alt=""
                width={296}
                height={296}
                loading="lazy"
                decoding="async"
              />
            </div>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

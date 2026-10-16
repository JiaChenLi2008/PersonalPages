import type { ReactNode } from "react";
import { Reveal } from "../../components/primitives/Reveal";
import { useLocale, type Locale } from "../../i18n";
import { useCopy, type CopyKey } from "../../i18n/copy";
import "./Values.css";

/**
 * Text nodes carry data-role — the marker components/primitives/TextRole stamps —
 * on plain elements, because the same nodes must also carry the `lang` attribute
 * (BLUEPRINT §6.4), which the frozen TextRole props do not accept.
 */

const PAGE_LANG: Record<Locale, string> = { en: "en", zh: "zh-Hans" };

type ValueCard = {
  title: CopyKey;
  delay: 0 | 1 | 2 | 3;
};

/** The four cards of ui.pen `Values`, in page order; each card's fill and ink pair comes from
    its design node through the nth-child block of Values.css. */
const CARDS: ValueCard[] = [
  { title: "values.card1", delay: 0 },
  { title: "values.card2", delay: 1 },
  { title: "values.card3", delay: 2 },
  { title: "values.card4", delay: 3 },
];

/** Values: four full-bleed cards, each a heading over the shared VALUE label. */
export function Values() {
  const copy = useCopy();
  const { locale } = useLocale();

  /** Dictionary text; text whose language differs from the page language keeps its own lang. */
  const t = (key: CopyKey): ReactNode => {
    const value = copy.text(key);
    const textLang = copy.langOf(key);
    return textLang === PAGE_LANG[locale] ? value : <span lang={textLang}>{value}</span>;
  };

  return (
    <section id="values" data-section="values" className="values">
      <ul className="values__cards" role="list">
        {CARDS.map((card) => (
          <Reveal as="li" key={card.title} delay={card.delay} className="values__card">
            <div className="values__card-inner motion-hover">
              {/* The card's mark, the shared VALUE label, slides in (③), so the Reveal is
                  the label's own element and the data-role marker moves inside it. */}
              <Reveal as="p" className="values__label motion-slide">
                <span data-role="K">{t("values.label")}</span>
              </Reveal>
              <h2 className="values__title" data-role="T">
                {t(card.title)}
              </h2>
            </div>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

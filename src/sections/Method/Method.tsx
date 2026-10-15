import type { ReactNode } from "react";
import { Reveal } from "../../components/primitives/Reveal";
import { useLocale, type Locale } from "../../i18n";
import { useCopy, type CopyKey } from "../../i18n/copy";
import "./Method.css";

/**
 * Text nodes carry data-role — the marker components/primitives/TextRole stamps —
 * on plain elements, because the same nodes must also carry the `id` (BLUEPRINT
 * §6.1) and `lang` (§6.4) attributes, which the frozen TextRole props do not accept.
 */

const PAGE_LANG: Record<Locale, string> = { en: "en", zh: "zh-Hans" };

type MethodColumn = {
  title: CopyKey;
  body: CopyKey;
  delay: 0 | 1 | 2 | 3;
};

/** The three columns of ui.pen `Columns.Cols`, in page order. */
const COLUMNS: MethodColumn[] = [
  { title: "method.col1.title", body: "method.col1.body", delay: 0 },
  { title: "method.col2.title", body: "method.col2.body", delay: 1 },
  { title: "method.col3.title", body: "method.col3.body", delay: 2 },
];

/** Method — ui.pen node t0l2bz (named Columns there), three columns with an accent stroke. */
export function Method() {
  const copy = useCopy();
  const { locale } = useLocale();

  /** Dictionary text; text whose language differs from the page language keeps its own lang. */
  const t = (key: CopyKey): ReactNode => {
    const value = copy.text(key);
    const textLang = copy.langOf(key);
    return textLang === PAGE_LANG[locale] ? value : <span lang={textLang}>{value}</span>;
  };

  return (
    <section id="method" data-section="method" aria-labelledby="method-title" className="method">
      <p className="method__eyebrow" data-role="K">
        {t("method.eyebrow")}
      </p>

      <Reveal>
        <h2 id="method-title" className="method__title" data-role="T">
          {t("method.title")}
        </h2>
      </Reveal>

      <div className="method__cols">
        {COLUMNS.map((column) => (
          <Reveal key={column.title} delay={column.delay} className="method__col">
            <div className="method__rule" aria-hidden="true" />
            <h3 className="method__col-title" data-role="T">
              {t(column.title)}
            </h3>
            <p className="method__col-d" data-role="D">
              {t(column.body)}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

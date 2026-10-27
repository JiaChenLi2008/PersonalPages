import type { ReactNode } from "react";
import { Reveal } from "../../components/primitives/Reveal";
import { useLocale, type Locale } from "../../i18n";
import { useCopy, type CopyKey } from "../../i18n/copy";
import "./Footer.css";

/**
 * Text nodes carry data-role — the marker components/primitives/TextRole stamps —
 * on plain elements, because the same nodes must also carry the `id` (BLUEPRINT
 * §6.1) and `lang` (§6.4) attributes, which the frozen TextRole props do not accept.
 */

const PAGE_LANG: Record<Locale, string> = { en: "en", zh: "zh-Hans" };

/** Footer: ink panel with the mail call to action. */
export function Footer() {
  const copy = useCopy();
  const { locale } = useLocale();

  /** Dictionary text; text whose language differs from the page language keeps its own lang. */
  const t = (key: CopyKey): ReactNode => {
    const value = copy.text(key);
    const textLang = copy.langOf(key);
    return textLang === PAGE_LANG[locale] ? value : <span lang={textLang}>{value}</span>;
  };

  return (
    <footer id="footer" data-section="footer" aria-labelledby="footer-title" className="footer">
      {/* The footer closes the page's entrance chain, so it takes the last stagger tier. */}
      <Reveal delay={3}>
        <div className="footer__contact">
          <h2 id="footer-title" className="footer__cta" data-role="T">
            {t("footer.cta")}
          </h2>
          <p className="footer__mail" data-role="E">
            {t("footer.mail")}
          </p>
        </div>
      </Reveal>
    </footer>
  );
}

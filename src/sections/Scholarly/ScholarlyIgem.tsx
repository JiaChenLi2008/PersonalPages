import { Rule } from "../../components/primitives/Rule";
import { Reveal } from "../../components/primitives/Reveal";
import { useCopy } from "../../i18n/copy";
import { useLang } from "../../i18n/lang";

/**
 * 01.1 iGEM (ui.pen `gE6yx`): Lab contribution and Paris Conference with the
 * project CTA in the left column, two 4:3 figure slots in the 360px right column.
 * `lang` always comes from the dictionary entry's own `lang` field (BLUEPRINT §6.4).
 * The board draws the CTA as one node holding both languages back to back; only the
 * page's own side reaches the DOM, so a page never carries the other one.
 *
 * Both figure slots carry the §4 device ② mask sweep (`.motion-clip`), which `Reveal`
 * starts once the slot scrolls in.
 */
export function ScholarlyIgem() {
  const { text, langOf } = useCopy();
  const { lang } = useLang();
  const zh = lang === "zh-Hans";

  return (
    <div className="scholarly__sub">
      <div className="scholarly__subhead">
        <p className="scholarly__num" lang={langOf("scholarly-igem.no")}>
          {text("scholarly-igem.no")}
        </p>
        <h3 className="scholarly__subtitle" lang={langOf("scholarly-igem.title")}>
          {text("scholarly-igem.title")}
        </h3>
      </div>
      <Rule variant="hairline" />

      <div className="scholarly__body scholarly__body--igem">
        <div className="scholarly__igemCol">
          <h4 className="scholarly__k" lang={langOf("scholarly-igem.sub1")}>
            {text("scholarly-igem.sub1")}
          </h4>
          <p className="scholarly__d" lang={langOf("scholarly-igem.para1")}>
            {text("scholarly-igem.para1")}
          </p>
          <h4 className="scholarly__k" lang={langOf("scholarly-igem.sub2")}>
            {text("scholarly-igem.sub2")}
          </h4>
          <p className="scholarly__d" lang={langOf("scholarly-igem.para2")}>
            {text("scholarly-igem.para2")}
          </p>
          <p className="scholarly__cta">
            {zh ? text("scholarly-igem.cta.zh") : text("scholarly-igem.cta.en")}
          </p>
          <p className="scholarly__ctaUrl">
            <a
              className="scholarly__url"
              href={text("scholarly-igem.cta.url")}
              lang={langOf("scholarly-igem.cta.url")}
              target="_blank"
              rel="noopener noreferrer"
            >
              {text("scholarly-igem.cta.url")}
            </a>
          </p>
        </div>

        <div className="scholarly__figcol">
          <figure className="scholarly__fig">
            <div className="scholarly__media scholarly__media--4x3">
              <Reveal className="scholarly__clip motion-clip">
                <img
                  className="scholarly__photo"
                  src="./media/igem-fig1-720.webp"
                  alt={text("scholarly-igem.fig1.alt")}
                  width={720}
                  height={540}
                  loading="lazy"
                  decoding="async"
                />
              </Reveal>
            </div>
            <figcaption className="scholarly__cap" lang={langOf("scholarly.figcap2")}>
              {text("scholarly.figcap2")}
            </figcaption>
          </figure>

          <figure className="scholarly__fig">
            <div className="scholarly__media scholarly__media--4x3">
              <Reveal className="scholarly__clip motion-clip">
                <img
                  className="scholarly__photo"
                  src="./media/igem-fig2-720.webp"
                  alt={text("scholarly-igem.fig2.alt")}
                  width={720}
                  height={540}
                  loading="lazy"
                  decoding="async"
                />
              </Reveal>
            </div>
            <figcaption className="scholarly__cap" lang={langOf("scholarly.figcap3")}>
              {text("scholarly.figcap3")}
            </figcaption>
          </figure>
        </div>
      </div>
    </div>
  );
}

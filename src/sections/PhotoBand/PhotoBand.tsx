import { useLocale } from "../../i18n";
import { useCopy, type CopyKey } from "../../i18n/copy";
import { Reveal } from "../../components/primitives/Reveal";
import "./PhotoBand.css";

/**
 * PhotoBand: the full-bleed 2.571 media slot plus its caption bar (ui.pen V3Yy1).
 * The slot is a proportional placeholder: the node's image is an Unsplash stand-in and
 * MANIFEST.json carries no photo for this band (BLUEPRINT §5 #1, §6.3).
 */
export function PhotoBand() {
  const { text, langOf } = useCopy();
  const { locale } = useLocale();

  /* BLUEPRINT §6.4: a text carries `lang` only when its own language differs from the page's. */
  const page = locale === "zh" ? "zh-Hans" : "en";
  const copyLang = (key: CopyKey) => (langOf(key) === page ? undefined : langOf(key));

  return (
    <section id="photoband" data-section="photo-band" className="photo-band">
      <Reveal>
        <figure className="photo-band__figure">
          {/* §5 placeholder: hidden from assistive tech, its label stays visible. */}
          <div className="photo-band__media" aria-hidden="true">
            <span className="photo-band__pending" lang={copyLang("scholarly.imagePending")}>
              {text("scholarly.imagePending")}
            </span>
          </div>
          <figcaption className="photo-band__cap">
            <span className="photo-band__figcap" lang={copyLang("photoband.figcap")}>
              {text("photoband.figcap")}
            </span>
            <span className="photo-band__altnote" lang={copyLang("photoband.altnote")}>
              {text("photoband.altnote")}
            </span>
          </figcaption>
        </figure>
      </Reveal>
    </section>
  );
}

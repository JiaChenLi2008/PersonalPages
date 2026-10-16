import { useLocale } from "../../i18n";
import { useCopy, type CopyKey } from "../../i18n/copy";
import { Reveal } from "../../components/primitives/Reveal";
import "./PhotoBand.css";

/**
 * PhotoBand: the full-bleed 18:7 media slot plus its caption bar (ui.pen V3Yy1).
 * The slot carries the design's own photo — public/media/photoband-2880.webp, cut to the
 * node's 2880×1120 source — so it is a decorative image (`alt=""`, BLUEPRINT §5) and the
 * caption bar below it carries the words.
 */
export function PhotoBand() {
  const { text, langOf } = useCopy();
  const { locale } = useLocale();

  /* BLUEPRINT §6.4: a text carries `lang` only when its own language differs from the page's. */
  const page = locale === "zh" ? "zh-Hans" : "en";
  const copyLang = (key: CopyKey) => (langOf(key) === page ? undefined : langOf(key));

  return (
    <section id="photoband" data-section="photo-band" className="photo-band">
      <Reveal as="figure" className="photo-band__figure">
        {/* Two devices, two elements: the slot sweeps open (.motion-clip) while the photo
            inside it travels with the scroll (.motion-parallax) — no property is shared. */}
        <Reveal as="div" className="photo-band__media motion-clip">
          <img
            className="photo-band__img motion-parallax"
            src="./media/photoband-2880.webp"
            alt=""
            width={2880}
            height={1120}
            loading="lazy"
            decoding="async"
          />
        </Reveal>
        <figcaption className="photo-band__cap">
          <span className="photo-band__figcap" lang={copyLang("photoband.figcap")}>
            {text("photoband.figcap")}
          </span>
          <span className="photo-band__altnote" lang={copyLang("photoband.altnote")}>
            {text("photoband.altnote")}
          </span>
        </figcaption>
      </Reveal>
    </section>
  );
}

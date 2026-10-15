import { Rule } from "../../components/primitives/Rule";
import { Reveal } from "../../components/primitives/Reveal";
import { useCopy } from "../../i18n/copy";
import "./Music.css";

/** Music (03): pull quote with its key-value row beside the 4:3 placeholder — ui.pen node Z79UYi. */
export function Music() {
  const { langOf, text } = useCopy();

  return (
    <section id="music" data-section="music" className="music" aria-labelledby="music-title">
      <h2 id="music-title" className="music__head">
        <span className="music__kicker" lang={langOf("music.kicker")}>
          {text("music.kicker")}
        </span>
        <span className="music__title-en" lang={langOf("music.titleEn")}>
          {text("music.titleEn")}
        </span>
      </h2>
      <Rule variant="baseline" />
      <Reveal as="div" className="music__body">
        <div className="music__col">
          <div className="music__pull">
            <span className="music__pull-rule" aria-hidden="true" />
            <p className="music__pull-text" lang={langOf("music.body")}>
              {text("music.body")}
            </p>
          </div>
          <dl className="music__kv">
            <dt className="music__k" lang={langOf("hero.key.instrument")}>
              {text("hero.key.instrument")}
            </dt>
            <dd className="music__v" lang={langOf("hero.val.instrument")}>
              {text("hero.val.instrument")}
            </dd>
          </dl>
        </div>
        <figure className="music__fig">
          {/* No asset for this section: the box keeps the design's 4:3 proportion. */}
          <div
            className="music__media"
            role="img"
            aria-label={text("scholarly.imagePending")}
          >
            <span className="music__ph" lang={langOf("scholarly.imagePending")}>
              {text("scholarly.imagePending")}
            </span>
          </div>
        </figure>
      </Reveal>
    </section>
  );
}

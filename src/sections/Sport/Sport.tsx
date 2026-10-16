import { Rule } from "../../components/primitives/Rule";
import { Reveal } from "../../components/primitives/Reveal";
import { useCopy } from "../../i18n/copy";
import "./Sport.css";

/** Sport (04): pull quote with its key-value row beside the 4:3 placeholder — ui.pen node wO1ZI. */
export function Sport() {
  const { langOf, text } = useCopy();

  return (
    <section id="sport" data-section="sport" className="sport" aria-labelledby="sport-title">
      <h2 id="sport-title" className="sport__head">
        <span className="sport__kicker" lang={langOf("sport.kicker")}>
          {text("sport.kicker")}
        </span>
        <span className="sport__title-en" lang={langOf("sport.titleEn")}>
          {text("sport.titleEn")}
        </span>
      </h2>
      <Rule variant="baseline" />
      <Reveal as="div" className="sport__body">
        <div className="sport__col">
          <div className="sport__pull">
            <span className="sport__pull-rule" aria-hidden="true" />
            <p className="sport__pull-text" lang={langOf("sport.body")}>
              {text("sport.body")}
            </p>
          </div>
          <dl className="sport__kv">
            <dt className="sport__k" lang={langOf("hero.key.sport")}>
              {text("hero.key.sport")}
            </dt>
            <dd className="sport__v" lang={langOf("hero.val.sport")}>
              {text("hero.val.sport")}
            </dd>
          </dl>
        </div>
        <figure className="sport__fig">
          {/* No asset for this section: the box keeps the design's 4:3 proportion and
              stays out of the accessibility tree rather than announcing an image that
              is not there — the pending label is chrome, not alt text (BLUEPRINT §6.3). */}
          <div className="sport__media" aria-hidden="true">
            <span className="sport__ph" lang={langOf("scholarly.imagePending")}>
              {text("scholarly.imagePending")}
            </span>
          </div>
        </figure>
      </Reveal>
    </section>
  );
}

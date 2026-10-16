import { Rule } from "../../components/primitives/Rule";
import { Reveal } from "../../components/primitives/Reveal";
import { useCopy } from "../../i18n/copy";
import "./Sport.css";

/**
 * Sport (04, `MOVE & GROOVE`) — the ui.pen frame wO1ZI: section head, 2px baseline,
 * pull quote with its key-value row beside the 4:3 photograph. The same structure as
 * Elder (02) / Music (03); the dictionary supplies this language's text only.
 */
export function Sport() {
  const { text, langOf } = useCopy();

  return (
    <section id="sport" data-section="sport" className="sport" aria-labelledby="sport-title">
      {/* The head's two texts arrive at the first stagger tier; the kicker carries the
          section number, so it is the block that slides in (motion.css .motion-slide). */}
      <h2 id="sport-title" className="sport__head">
        <Reveal as="span" className="sport__kicker motion-slide">
          {text("sport.kicker")}
        </Reveal>
        <Reveal as="span" className="sport__title-en">
          {text("sport.titleEn")}
        </Reveal>
      </h2>
      <Rule variant="baseline" />
      <div className="sport__body">
        <Reveal as="div" className="sport__col" delay={1}>
          <div className="sport__pull">
            <span className="sport__pull-rule" aria-hidden="true" />
            <p className="sport__pull-text" lang={langOf("sport.body")}>
              {text("sport.body")}
            </p>
          </div>
          <dl className="sport__kv motion-hover">
            <dt className="sport__k" lang={langOf("hero.key.sport")}>
              {text("hero.key.sport")}
            </dt>
            <dd className="sport__v" lang={langOf("hero.val.sport")}>
              {text("hero.val.sport")}
            </dd>
          </dl>
        </Reveal>
        {/* The figure sweeps in under its clip-path mask one tier behind the text column.
            A clipped element has no visible area, so the 15% observer default could never
            be met: threshold 0 is the trigger this hook needs. The box is decorative beside
            the pull quote, so the photograph stays out of the accessibility tree
            (BLUEPRINT §6.3) while its alt text is the dictionary's. */}
        <Reveal as="figure" className="sport__fig motion-clip" delay={2} threshold={0}>
          <div className="sport__media" aria-hidden="true">
            <img
              className="sport__photo"
              src="media/sport-fig-720.webp"
              alt={text("sport.fig.alt")}
              width={720}
              height={540}
              loading="lazy"
              decoding="async"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

import { Rule } from "../../components/primitives/Rule";
import { Reveal } from "../../components/primitives/Reveal";
import { useCopy } from "../../i18n/copy";
import "./Elder.css";

/**
 * Elder (02, `HANDS FOR THE ELDER`) — the ui.pen frame s18X3i: section head, 2px
 * baseline, pull quote with its key-value row beside the 4:3 photograph. The same
 * structure as Music (03) / Sport (04), and the dictionary supplies this language's
 * text only (BLUEPRINT §6.4).
 */
export function Elder() {
  const { text, langOf } = useCopy();

  return (
    <section id="elder" data-section="elder" className="elder" aria-labelledby="elder-title">
      {/* The head's two texts arrive at the first stagger tier; the kicker carries the
          section number, so it is the block that slides in (motion.css .motion-slide). */}
      <h2 id="elder-title" className="elder__head">
        <Reveal as="span" className="elder__kicker motion-slide">
          {text("elder.kicker")}
        </Reveal>
        <Reveal as="span" className="elder__title-en">
          {text("elder.title.en")}
        </Reveal>
      </h2>
      <Rule variant="baseline" />
      <div className="elder__body">
        <Reveal as="div" className="elder__col" delay={1}>
          <div className="elder__pull">
            <span className="elder__pull-rule" aria-hidden="true" />
            <p className="elder__pull-text" lang={langOf("elder.pull")}>
              {text("elder.pull")}
            </p>
          </div>
          <dl className="elder__kv motion-hover">
            <dt className="elder__k" lang={langOf("elder.kv.k")}>
              {text("elder.kv.k")}
            </dt>
            <dd className="elder__v" lang={langOf("elder.kv.v")}>
              {text("elder.kv.v")}
            </dd>
          </dl>
        </Reveal>
        {/* The figure sweeps in under its clip-path mask one tier behind the text column.
            A clipped element has no visible area, so the 15% observer default could never
            be met: threshold 0 is the trigger this hook needs. The box is decorative beside
            the pull quote, so the photograph stays out of the accessibility tree
            (BLUEPRINT §6.3) while its alt text is the dictionary's. */}
        <Reveal as="figure" className="elder__fig motion-clip" delay={2} threshold={0}>
          <div className="elder__media" aria-hidden="true">
            <img
              className="elder__photo"
              src="media/elder-fig-720.webp"
              alt={text("elder.fig.alt")}
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

import { Rule } from "../../components/primitives/Rule";
import { Reveal } from "../../components/primitives/Reveal";
import { useCopy } from "../../i18n/copy";
import "./Music.css";

/**
 * Music (03, `SOUND & SOUL`) — the ui.pen frame Z79UYi: section head, 2px baseline,
 * pull quote with its key-value row beside the 4:3 photograph. The same structure as
 * Elder (02) / Sport (04); the dictionary supplies this language's text only.
 */
export function Music() {
  const { text, langOf } = useCopy();

  return (
    <section id="music" data-section="music" className="music" aria-labelledby="music-title">
      {/* The head's two texts arrive at the first stagger tier; the kicker carries the
          section number, so it is the block that slides in (motion.css .motion-slide). */}
      <h2 id="music-title" className="music__head">
        <Reveal as="span" className="music__kicker motion-slide">
          {text("music.kicker")}
        </Reveal>
        <Reveal as="span" className="music__title-en">
          {text("music.titleEn")}
        </Reveal>
      </h2>
      <Rule variant="baseline" />
      <div className="music__body">
        <Reveal as="div" className="music__col" delay={1}>
          <div className="music__pull">
            <span className="music__pull-rule" aria-hidden="true" />
            <p className="music__pull-text" lang={langOf("music.body")}>
              {text("music.body")}
            </p>
          </div>
          <dl className="music__kv motion-hover">
            <dt className="music__k" lang={langOf("hero.key.instrument")}>
              {text("hero.key.instrument")}
            </dt>
            <dd className="music__v" lang={langOf("hero.val.instrument")}>
              {text("hero.val.instrument")}
            </dd>
          </dl>
        </Reveal>
        {/* The figure sweeps in under its clip-path mask one tier behind the text column.
            A clipped element has no visible area, so the 15% observer default could never
            be met: threshold 0 is the trigger this hook needs. The box is decorative beside
            the pull quote, so the photograph stays out of the accessibility tree
            (BLUEPRINT §6.3) while its alt text is the dictionary's. */}
        <Reveal as="figure" className="music__fig motion-clip" delay={2} threshold={0}>
          <div className="music__media" aria-hidden="true">
            <img
              className="music__photo"
              src="media/music-fig-720.webp"
              alt={text("music.fig.alt")}
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

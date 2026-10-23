import { Lightbox } from "../../components/Lightbox/Lightbox";
import { PhotoStrip, type StripPhoto } from "../../components/PhotoStrip/PhotoStrip";
import { Rule } from "../../components/primitives/Rule";
import { Reveal } from "../../components/primitives/Reveal";
import { useCopy } from "../../i18n/copy";
import "./Sport.css";

/**
 * The four photographs of the wall the docx puts ahead of this section's text (页面7,
 * "先放照片滚动墙"). Same component, same decoration rule as Music's nine.
 */
const SPORT_WALL = [
  { src: "media/sport-wall-1.webp", width: 360, height: 540 },
  { src: "media/sport-wall-2.webp", width: 360, height: 240 },
  { src: "media/sport-wall-3.webp", width: 360, height: 270 },
  { src: "media/sport-wall-4.webp", width: 360, height: 240 },
] as const satisfies readonly StripPhoto[];

/**
 * Sport (04, `MOVE & GROOVE`) — the ui.pen frame wO1ZI: section head, 2px baseline, the
 * wall of photographs the docx wants first (页面7), then the new lead paragraph and the
 * 4:3 photograph. The same structure as Elder (02) / Music (03); the dictionary supplies
 * this language's text only.
 *
 * The docx's own line is `sport.lead` and it replaces the paragraph in the pull block —
 * the same slot, the same style, a different sentence (user ruling). The old sentence's key
 * `sport.body` stays in both dictionaries but is no longer rendered; it is registered as a
 * dead key in docs/CHROME.md §4 so tools/verify-copy-wiring.mjs does not read the
 * unreferenced key as a broken wiring path.
 */
export function Sport() {
  const { text, langOf } = useCopy();

  return (
    <section id="sport" data-section="sport" className="sport" aria-labelledby="sport-title">
      {/* docx-1023 item 8 (user ruling): drop the right-hand duplicate title, kicker 14px/--c-blue.
          The kicker alone names the section; it stays the one block that slides in. */}
      <h2 id="sport-title" className="sport__head">
        <Reveal as="span" className="sport__kicker motion-slide">
          {text("sport.kicker")}
        </Reveal>
      </h2>
      <Rule variant="baseline" />
      <PhotoStrip name="sport-wall" photos={SPORT_WALL} />
      <div className="sport__body">
        <Reveal as="div" className="sport__col" delay={1}>
          <div className="sport__pull">
            <span className="sport__pull-rule" aria-hidden="true" />
            <p className="sport__pull-text" lang={langOf("sport.lead")}>
              {text("sport.lead")}
            </p>
          </div>
        </Reveal>
        {/* The figure sweeps in under its clip-path mask one tier behind the text column.
            A clipped element has no visible area, so the 15% observer default could never
            be met: threshold 0 is the trigger this hook needs. The box stays decorative
            (BLUEPRINT §6.3) while its alt key becomes the lightbox trigger's accessible name. */}
        <Reveal as="figure" className="sport__fig motion-clip" delay={2} threshold={0}>
          <Lightbox
            full="media/sport-fig-1440.webp"
            alt={text("sport.fig.alt")}
            width={1440}
            height={1080}
          >
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
          </Lightbox>
        </Reveal>
      </div>
    </section>
  );
}

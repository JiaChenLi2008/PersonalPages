import { Photo } from "../../components/Photo/Photo";
import { Rule } from "../../components/primitives/Rule";
import { Reveal } from "../../components/primitives/Reveal";
import { useCopy } from "../../i18n/copy";
import "./Elder.css";

/**
 * Elder (02, `HANDS FOR THE ELDER`) — the ui.pen frame s18X3i: section head, 2px
 * baseline, pull quote with its key-value row beside the 4:3 photograph. The same
 * structure as Music (03) / Sport (04), and the dictionary supplies this language's
 * text only (BLUEPRINT §6.4). docx-1023 §10 closes the section with the hospital
 * guide table and its workbook card.
 */
export function Elder() {
  const { text, langOf } = useCopy();

  return (
    <section id="elder" data-section="elder" className="elder" aria-labelledby="elder-title">
      {/* docx-1023 item 8 (user ruling): drop the right-hand duplicate title, kicker 14px/--c-blue.
          The kicker alone names the section; it stays the one block that slides in. */}
      <h2 id="elder-title" className="elder__head">
        <Reveal as="span" className="elder__kicker motion-slide">
          {text("elder.kicker")}
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
          {/* docx-1028 段[10]…[12]: the three paragraphs that fill the column's empty
              stretch above the guide card. */}
          <div className="elder__essay">
            <p lang={langOf("elder.essay.p1")}>
              {text("elder.essay.p1")}
            </p>
            <p lang={langOf("elder.essay.p2")}>
              {text("elder.essay.p2")}
            </p>
            <p lang={langOf("elder.essay.p3")}>
              {text("elder.essay.p3")}
            </p>
          </div>
        </Reveal>
        {/* The figure sweeps in under its clip-path mask one tier behind the text column.
            A clipped element has no visible area, so the 15% observer default could never
            be met: threshold 0 is the trigger this hook needs. The box is decorative beside
            the pull quote, so the photograph stays out of the accessibility tree
            (BLUEPRINT §6.3) while its alt text is the dictionary's. */}
        <Reveal as="figure" className="elder__fig motion-clip" delay={2} threshold={0}>
          <div className="elder__media" aria-hidden="true">
            <Photo
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
      {/* docx-1023 §10: the hospital workbook the section hands out. The card is the block's
          only content — the twelve rows live in the workbook, not on the page. */}
      <div className="elder__guide">
        <div className="elder__docCard">
          <div className="elder__docL">
            <p className="elder__docTitle" lang={langOf("elder.guide.title")}>
              {text("elder.guide.title")}
            </p>
            <p className="elder__meta" lang={langOf("elder.guide.meta")}>
              {text("elder.guide.meta")}
            </p>
          </div>
          <a
            className="elder__link"
            href="./media/shanghai-hospitals.xlsx"
            target="_blank"
            rel="noopener noreferrer"
            lang={langOf("elder.guide.download")}
          >
            {text("elder.guide.download")}
          </a>
        </div>
      </div>
    </section>
  );
}

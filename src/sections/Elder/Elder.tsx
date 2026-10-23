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
      {/* docx-1023 §10: the twelve hospitals as one table — content is the table, so it
          carries no sort button, no folding and no paging. The card below hands the same
          rows out as the workbook. */}
      <div className="elder__guide">
        <h3
          id="elder-guide-title"
          className="elder__guideTitle"
          lang={langOf("elder.guide.title")}
        >
          {text("elder.guide.title")}
        </h3>
        <p className="elder__guideLead" lang={langOf("elder.guide.body")}>
          {text("elder.guide.body")}
        </p>
        {/* Wide content in a narrow column: the region scrolls sideways instead of
            squeezing the cells, and tabIndex keeps that scroll reachable by keyboard. */}
        <div
          className="elder__guideScroll"
          role="region"
          tabIndex={0}
          aria-labelledby="elder-guide-title"
        >
          <table className="elder__guideTable">
            <thead>
              <tr>
                <th scope="col" lang={langOf("elder.guide.head.hospital")}>
                  {text("elder.guide.head.hospital")}
                </th>
                <th scope="col" lang={langOf("elder.guide.head.checkin")}>
                  {text("elder.guide.head.checkin")}
                </th>
                <th scope="col" lang={langOf("elder.guide.head.tests")}>
                  {text("elder.guide.head.tests")}
                </th>
                <th scope="col" lang={langOf("elder.guide.head.tips")}>
                  {text("elder.guide.head.tips")}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td lang={langOf("elder.guide.r01.name")}>{text("elder.guide.r01.name")}</td>
                <td lang={langOf("elder.guide.r01.checkin")}>{text("elder.guide.r01.checkin")}</td>
                <td lang={langOf("elder.guide.r01.tests")}>{text("elder.guide.r01.tests")}</td>
                <td lang={langOf("elder.guide.r01.tips")}>{text("elder.guide.r01.tips")}</td>
              </tr>
              <tr>
                <td lang={langOf("elder.guide.r02.name")}>{text("elder.guide.r02.name")}</td>
                <td lang={langOf("elder.guide.r02.checkin")}>{text("elder.guide.r02.checkin")}</td>
                <td lang={langOf("elder.guide.r02.tests")}>{text("elder.guide.r02.tests")}</td>
                <td lang={langOf("elder.guide.r02.tips")}>{text("elder.guide.r02.tips")}</td>
              </tr>
              <tr>
                <td lang={langOf("elder.guide.r03.name")}>{text("elder.guide.r03.name")}</td>
                <td lang={langOf("elder.guide.r03.checkin")}>{text("elder.guide.r03.checkin")}</td>
                <td lang={langOf("elder.guide.r03.tests")}>{text("elder.guide.r03.tests")}</td>
                <td lang={langOf("elder.guide.r03.tips")}>{text("elder.guide.r03.tips")}</td>
              </tr>
              <tr>
                <td lang={langOf("elder.guide.r04.name")}>{text("elder.guide.r04.name")}</td>
                <td lang={langOf("elder.guide.r04.checkin")}>{text("elder.guide.r04.checkin")}</td>
                <td lang={langOf("elder.guide.r04.tests")}>{text("elder.guide.r04.tests")}</td>
                <td lang={langOf("elder.guide.r04.tips")}>{text("elder.guide.r04.tips")}</td>
              </tr>
              <tr>
                <td lang={langOf("elder.guide.r05.name")}>{text("elder.guide.r05.name")}</td>
                <td lang={langOf("elder.guide.r05.checkin")}>{text("elder.guide.r05.checkin")}</td>
                <td lang={langOf("elder.guide.r05.tests")}>{text("elder.guide.r05.tests")}</td>
                <td lang={langOf("elder.guide.r05.tips")}>{text("elder.guide.r05.tips")}</td>
              </tr>
              <tr>
                <td lang={langOf("elder.guide.r06.name")}>{text("elder.guide.r06.name")}</td>
                <td lang={langOf("elder.guide.r06.checkin")}>{text("elder.guide.r06.checkin")}</td>
                <td lang={langOf("elder.guide.r06.tests")}>{text("elder.guide.r06.tests")}</td>
                <td lang={langOf("elder.guide.r06.tips")}>{text("elder.guide.r06.tips")}</td>
              </tr>
              <tr>
                <td lang={langOf("elder.guide.r07.name")}>{text("elder.guide.r07.name")}</td>
                <td lang={langOf("elder.guide.r07.checkin")}>{text("elder.guide.r07.checkin")}</td>
                <td lang={langOf("elder.guide.r07.tests")}>{text("elder.guide.r07.tests")}</td>
                <td lang={langOf("elder.guide.r07.tips")}>{text("elder.guide.r07.tips")}</td>
              </tr>
              <tr>
                <td lang={langOf("elder.guide.r08.name")}>{text("elder.guide.r08.name")}</td>
                <td lang={langOf("elder.guide.r08.checkin")}>{text("elder.guide.r08.checkin")}</td>
                <td lang={langOf("elder.guide.r08.tests")}>{text("elder.guide.r08.tests")}</td>
                <td lang={langOf("elder.guide.r08.tips")}>{text("elder.guide.r08.tips")}</td>
              </tr>
              <tr>
                <td lang={langOf("elder.guide.r09.name")}>{text("elder.guide.r09.name")}</td>
                <td lang={langOf("elder.guide.r09.checkin")}>{text("elder.guide.r09.checkin")}</td>
                <td lang={langOf("elder.guide.r09.tests")}>{text("elder.guide.r09.tests")}</td>
                <td lang={langOf("elder.guide.r09.tips")}>{text("elder.guide.r09.tips")}</td>
              </tr>
              <tr>
                <td lang={langOf("elder.guide.r10.name")}>{text("elder.guide.r10.name")}</td>
                <td lang={langOf("elder.guide.r10.checkin")}>{text("elder.guide.r10.checkin")}</td>
                <td lang={langOf("elder.guide.r10.tests")}>{text("elder.guide.r10.tests")}</td>
                <td lang={langOf("elder.guide.r10.tips")}>{text("elder.guide.r10.tips")}</td>
              </tr>
              <tr>
                <td lang={langOf("elder.guide.r11.name")}>{text("elder.guide.r11.name")}</td>
                <td lang={langOf("elder.guide.r11.checkin")}>{text("elder.guide.r11.checkin")}</td>
                <td lang={langOf("elder.guide.r11.tests")}>{text("elder.guide.r11.tests")}</td>
                <td lang={langOf("elder.guide.r11.tips")}>{text("elder.guide.r11.tips")}</td>
              </tr>
              <tr>
                <td lang={langOf("elder.guide.r12.name")}>{text("elder.guide.r12.name")}</td>
                <td lang={langOf("elder.guide.r12.checkin")}>{text("elder.guide.r12.checkin")}</td>
                <td lang={langOf("elder.guide.r12.tests")}>{text("elder.guide.r12.tests")}</td>
                <td lang={langOf("elder.guide.r12.tips")}>{text("elder.guide.r12.tips")}</td>
              </tr>
            </tbody>
          </table>
        </div>
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
